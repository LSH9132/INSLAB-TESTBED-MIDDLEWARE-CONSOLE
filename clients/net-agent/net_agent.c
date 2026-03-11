#define _POSIX_C_SOURCE 200809L

#include <arpa/inet.h>
#include <ctype.h>
#include <errno.h>
#include <limits.h>
#include <netdb.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <time.h>
#include <unistd.h>

#define MAX_IFACES 64
#define MAX_LINE 2048
#define ACK_BUF 32

struct iface_sample {
  char iface[64];
  unsigned long long rx_bytes;
  unsigned long long tx_bytes;
  unsigned long long rx_packets;
  unsigned long long tx_packets;
};

struct iface_state {
  char iface[64];
  unsigned long long rx_bytes;
  unsigned long long tx_bytes;
  unsigned long long rx_packets;
  unsigned long long tx_packets;
  int active;
};

struct config {
  char node_id[128];
  char host[256];
  char spool_path[PATH_MAX];
  char state_path[PATH_MAX];
  char agent_version[64];
  char auth_token[1024];
  int port;
  int interval_sec;
  int protocol_version;
  long long max_spool_bytes;
};

static void trim(char *value) {
  size_t len = strlen(value);
  while (len > 0 && isspace((unsigned char) value[len - 1])) {
    value[--len] = '\0';
  }
  size_t start = 0;
  while (value[start] && isspace((unsigned char) value[start])) {
    start++;
  }
  if (start > 0) {
    memmove(value, value + start, strlen(value + start) + 1);
  }
}

static void load_env_file(const char *path) {
  FILE *fp = fopen(path, "r");
  if (!fp) {
    return;
  }

  char *line = NULL;
  size_t cap = 0;
  while (getline(&line, &cap, fp) != -1) {
    trim(line);
    if (line[0] == '\0' || line[0] == '#') {
      continue;
    }
    char *eq = strchr(line, '=');
    if (!eq) {
      continue;
    }
    *eq = '\0';
    char *key = line;
    char *value = eq + 1;
    trim(key);
    trim(value);
    setenv(key, value, 0);
  }

  free(line);
  fclose(fp);
}

static void ensure_parent_dir(const char *path) {
  char tmp[PATH_MAX];
  snprintf(tmp, sizeof(tmp), "%s", path);
  for (char *p = tmp + 1; *p; ++p) {
    if (*p == '/') {
      *p = '\0';
      mkdir(tmp, 0755);
      *p = '/';
    }
  }
}

static void load_config(struct config *cfg) {
  memset(cfg, 0, sizeof(*cfg));
  load_env_file("/etc/net-agent/net-agent.env");

  const char *node_id = getenv("NODE_ID");
  const char *host = getenv("LOG_SERVER_HOST");
  const char *spool_path = getenv("SPOOL_PATH");
  const char *agent_version = getenv("AGENT_VERSION");
  const char *auth_token = getenv("AUTH_TOKEN");

  snprintf(cfg->node_id, sizeof(cfg->node_id), "%s", node_id ? node_id : "unknown-node");
  snprintf(cfg->host, sizeof(cfg->host), "%s", host ? host : "127.0.0.1");
  snprintf(cfg->spool_path, sizeof(cfg->spool_path), "%s", spool_path ? spool_path : "/tmp/net-agent-spool.ndjson");
  snprintf(cfg->state_path, sizeof(cfg->state_path), "%s.state", cfg->spool_path);
  snprintf(cfg->agent_version, sizeof(cfg->agent_version), "%s", agent_version ? agent_version : "0.1.0");
  snprintf(cfg->auth_token, sizeof(cfg->auth_token), "%s", auth_token ? auth_token : "");
  cfg->port = getenv("LOG_SERVER_PORT") ? atoi(getenv("LOG_SERVER_PORT")) : 5140;
  cfg->interval_sec = getenv("SAMPLE_INTERVAL_SEC") ? atoi(getenv("SAMPLE_INTERVAL_SEC")) : 5;
  cfg->protocol_version = getenv("PROTOCOL_VERSION") ? atoi(getenv("PROTOCOL_VERSION")) : 1;
  cfg->max_spool_bytes = getenv("MAX_SPOOL_BYTES") ? atoll(getenv("MAX_SPOOL_BYTES")) : 10 * 1024 * 1024LL;
}

static long long now_ms(void) {
  struct timespec ts;
  clock_gettime(CLOCK_REALTIME, &ts);
  return ((long long) ts.tv_sec * 1000LL) + (ts.tv_nsec / 1000000LL);
}

static int read_proc_net_dev(struct iface_sample *samples, size_t *count) {
  FILE *fp = fopen("/proc/net/dev", "r");
  if (!fp) {
    perror("fopen /proc/net/dev");
    return -1;
  }

  char line[1024];
  size_t index = 0;
  int line_no = 0;

  while (fgets(line, sizeof(line), fp)) {
    line_no++;
    if (line_no <= 2) {
      continue;
    }

    char *colon = strchr(line, ':');
    if (!colon) {
      continue;
    }

    *colon = '\0';
    trim(line);
    if (strcmp(line, "lo") == 0) {
      continue;
    }

    unsigned long long fields[16] = {0};
    if (sscanf(
          colon + 1,
          "%llu %llu %llu %llu %llu %llu %llu %llu %llu %llu %llu %llu %llu %llu %llu %llu",
          &fields[0], &fields[1], &fields[2], &fields[3], &fields[4], &fields[5], &fields[6], &fields[7],
          &fields[8], &fields[9], &fields[10], &fields[11], &fields[12], &fields[13], &fields[14], &fields[15]) < 10) {
      continue;
    }

    if (index >= MAX_IFACES) {
      break;
    }

    snprintf(samples[index].iface, sizeof(samples[index].iface), "%s", line);
    samples[index].rx_bytes = fields[0];
    samples[index].rx_packets = fields[1];
    samples[index].tx_bytes = fields[8];
    samples[index].tx_packets = fields[9];
    index++;
  }

  fclose(fp);
  *count = index;
  return 0;
}

static struct iface_state *find_state(struct iface_state *states, size_t state_count, const char *iface) {
  for (size_t i = 0; i < state_count; ++i) {
    if (states[i].active && strcmp(states[i].iface, iface) == 0) {
      return &states[i];
    }
  }
  return NULL;
}

static long long load_offset(const char *state_path) {
  FILE *fp = fopen(state_path, "r");
  if (!fp) {
    return 0;
  }

  long long offset = 0;
  fscanf(fp, "%lld", &offset);
  fclose(fp);
  return offset;
}

static void save_offset(const char *state_path, long long offset) {
  ensure_parent_dir(state_path);
  FILE *fp = fopen(state_path, "w");
  if (!fp) {
    perror("fopen state");
    return;
  }
  fprintf(fp, "%lld\n", offset);
  fclose(fp);
}

static void append_line(const char *path, const char *line) {
  ensure_parent_dir(path);
  FILE *fp = fopen(path, "a");
  if (!fp) {
    perror("fopen spool");
    return;
  }
  fputs(line, fp);
  fputc('\n', fp);
  fclose(fp);
}

static int connect_server(const char *host, int port) {
  char port_str[16];
  snprintf(port_str, sizeof(port_str), "%d", port);

  struct addrinfo hints;
  memset(&hints, 0, sizeof(hints));
  hints.ai_family = AF_UNSPEC;
  hints.ai_socktype = SOCK_STREAM;

  struct addrinfo *result = NULL;
  if (getaddrinfo(host, port_str, &hints, &result) != 0) {
    return -1;
  }

  int sock = -1;
  for (struct addrinfo *rp = result; rp; rp = rp->ai_next) {
    sock = socket(rp->ai_family, rp->ai_socktype, rp->ai_protocol);
    if (sock == -1) {
      continue;
    }
    if (connect(sock, rp->ai_addr, rp->ai_addrlen) == 0) {
      break;
    }
    close(sock);
    sock = -1;
  }

  freeaddrinfo(result);
  return sock;
}

static int read_ack(int sock) {
  char buf[ACK_BUF];
  size_t idx = 0;
  while (idx + 1 < sizeof(buf)) {
    ssize_t n = recv(sock, &buf[idx], 1, 0);
    if (n <= 0) {
      return -1;
    }
    if (buf[idx] == '\n') {
      buf[idx] = '\0';
      return strcmp(buf, "ACK") == 0 ? 0 : -1;
    }
    idx++;
  }
  return -1;
}

static void compact_spool(const struct config *cfg) {
  long long offset = load_offset(cfg->state_path);
  FILE *src = fopen(cfg->spool_path, "r");
  if (!src) {
    return;
  }

  if (fseeko(src, offset, SEEK_SET) != 0) {
    fclose(src);
    return;
  }

  char tmp_path[PATH_MAX];
  snprintf(tmp_path, sizeof(tmp_path), "%s.tmp", cfg->spool_path);
  FILE *dst = fopen(tmp_path, "w");
  if (!dst) {
    fclose(src);
    return;
  }

  char buffer[4096];
  size_t nread;
  while ((nread = fread(buffer, 1, sizeof(buffer), src)) > 0) {
    fwrite(buffer, 1, nread, dst);
  }

  fclose(src);
  fclose(dst);

  rename(tmp_path, cfg->spool_path);
  save_offset(cfg->state_path, 0);
}

static void enforce_spool_limit(const struct config *cfg) {
  compact_spool(cfg);

  FILE *fp = fopen(cfg->spool_path, "r");
  if (!fp) {
    return;
  }

  struct stat st;
  if (stat(cfg->spool_path, &st) != 0 || st.st_size <= cfg->max_spool_bytes) {
    fclose(fp);
    return;
  }

  char **lines = NULL;
  size_t *lengths = NULL;
  size_t count = 0;
  size_t cap = 0;
  long long total = 0;

  char *line = NULL;
  size_t line_cap = 0;
  while (getline(&line, &line_cap, fp) != -1) {
    size_t len = strlen(line);
    if (count == cap) {
      size_t next_cap = cap == 0 ? 128 : cap * 2;
      char **new_lines = realloc(lines, next_cap * sizeof(*lines));
      size_t *new_lengths = realloc(lengths, next_cap * sizeof(*lengths));
      if (!new_lines || !new_lengths) {
        free(new_lines);
        free(new_lengths);
        break;
      }
      lines = new_lines;
      lengths = new_lengths;
      cap = next_cap;
    }
    lines[count] = strdup(line);
    lengths[count] = len;
    total += (long long) len;
    count++;
  }
  free(line);
  fclose(fp);

  size_t keep_from = 0;
  while (keep_from < count && total > cfg->max_spool_bytes) {
    total -= (long long) lengths[keep_from];
    keep_from++;
  }

  char tmp_path[PATH_MAX];
  snprintf(tmp_path, sizeof(tmp_path), "%s.trim", cfg->spool_path);
  FILE *dst = fopen(tmp_path, "w");
  if (dst) {
    for (size_t i = keep_from; i < count; ++i) {
      fputs(lines[i], dst);
    }
    fclose(dst);
    rename(tmp_path, cfg->spool_path);
    save_offset(cfg->state_path, 0);
  }

  for (size_t i = 0; i < count; ++i) {
    free(lines[i]);
  }
  free(lines);
  free(lengths);
}

static void flush_spool(const struct config *cfg) {
  FILE *fp = fopen(cfg->spool_path, "r");
  if (!fp) {
    return;
  }

  long long offset = load_offset(cfg->state_path);
  if (fseeko(fp, offset, SEEK_SET) != 0) {
    fclose(fp);
    return;
  }

  int sock = connect_server(cfg->host, cfg->port);
  if (sock < 0) {
    fclose(fp);
    return;
  }

  char *line = NULL;
  size_t cap = 0;
  while (getline(&line, &cap, fp) != -1) {
    size_t len = strlen(line);
    if (send(sock, line, len, 0) != (ssize_t) len) {
      break;
    }
    if (line[len - 1] != '\n' && send(sock, "\n", 1, 0) != 1) {
      break;
    }
    if (read_ack(sock) != 0) {
      break;
    }
    offset = (long long) ftello(fp);
    save_offset(cfg->state_path, offset);
  }

  free(line);
  close(sock);
  fclose(fp);
  compact_spool(cfg);
}

int main(void) {
  struct config cfg;
  load_config(&cfg);

  struct iface_state states[MAX_IFACES];
  memset(states, 0, sizeof(states));
  size_t state_count = 0;
  unsigned int seq = 1;

  for (;;) {
    struct iface_sample samples[MAX_IFACES];
    size_t sample_count = 0;

    if (read_proc_net_dev(samples, &sample_count) == 0) {
      long long timestamp = now_ms();

      for (size_t i = 0; i < sample_count; ++i) {
        struct iface_state *prev = find_state(states, state_count, samples[i].iface);
        double rx_bps = 0.0;
        double tx_bps = 0.0;
        double rx_pps = 0.0;
        double tx_pps = 0.0;

        if (prev) {
          rx_bps = (double) (samples[i].rx_bytes - prev->rx_bytes) / cfg.interval_sec;
          tx_bps = (double) (samples[i].tx_bytes - prev->tx_bytes) / cfg.interval_sec;
          rx_pps = (double) (samples[i].rx_packets - prev->rx_packets) / cfg.interval_sec;
          tx_pps = (double) (samples[i].tx_packets - prev->tx_packets) / cfg.interval_sec;
        } else if (state_count < MAX_IFACES) {
          prev = &states[state_count++];
          memset(prev, 0, sizeof(*prev));
          snprintf(prev->iface, sizeof(prev->iface), "%s", samples[i].iface);
          prev->active = 1;
        }

        if (!prev) {
          continue;
        }

        prev->rx_bytes = samples[i].rx_bytes;
        prev->tx_bytes = samples[i].tx_bytes;
        prev->rx_packets = samples[i].rx_packets;
        prev->tx_packets = samples[i].tx_packets;

        char line[MAX_LINE];
        snprintf(
          line,
          sizeof(line),
          "{\"kind\":\"net_sample\",\"protocolVersion\":%d,\"authToken\":\"%s\",\"sample\":{\"nodeId\":\"%s\",\"iface\":\"%s\",\"timestamp\":%lld,"
          "\"seq\":%u,\"rxBytes\":%llu,\"txBytes\":%llu,\"rxPackets\":%llu,\"txPackets\":%llu,"
          "\"rxBps\":%.3f,\"txBps\":%.3f,\"rxPps\":%.3f,\"txPps\":%.3f,\"agentVersion\":\"%s\"}}",
          cfg.protocol_version,
          cfg.auth_token,
          cfg.node_id,
          samples[i].iface,
          timestamp,
          seq++,
          samples[i].rx_bytes,
          samples[i].tx_bytes,
          samples[i].rx_packets,
          samples[i].tx_packets,
          rx_bps,
          tx_bps,
          rx_pps,
          tx_pps,
          cfg.agent_version);
        append_line(cfg.spool_path, line);
      }
    }

    enforce_spool_limit(&cfg);
    flush_spool(&cfg);
    sleep((unsigned int) cfg.interval_sec);
  }

  return 0;
}
