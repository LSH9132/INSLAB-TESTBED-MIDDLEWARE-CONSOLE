CC ?= cc
CFLAGS ?= -O2 -Wall -Wextra -pedantic -std=c11
TARGET = net-agent

all: $(TARGET)

$(TARGET): net_agent.c
	$(CC) $(CFLAGS) -o $(TARGET) net_agent.c

clean:
	rm -f $(TARGET)
