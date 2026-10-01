# Computer Networks, Packet by Packet

> **An Explorable Architectural Guide to Modern Internet Protocol Stacks**  
> Live URL: [https://deepshah08.github.io/a2z-networks-fundamentals/](https://deepshah08.github.io/a2z-networks-fundamentals/)

A zero-dependency, pure web standards interactive textbook and visual exploration engine inspired by *LLMs, Token by Token* and *Operating Systems, Cycle by Cycle*.

---

## 📚 Curricular Scope & Foundational Sources

Synthesized from the foundational canon of computer networking:
- **Kurose & Ross** — *Computer Networking: A Top-Down Approach*
- **Peterson & Davie** — *Computer Networks: A Systems Approach*
- **W. Richard Stevens** — *TCP/IP Illustrated, Volume 1 (The Protocols)*
- **Andrew S. Tanenbaum** — *Computer Networks*
- **Modern Systems Reality (2026)** — QUIC/HTTP/3, BBR v3, TLS 1.3, eBPF XDP, BGP Peering, IPv6 SLAAC, Software-Defined Networking (OpenFlow/P4).

---

## 🧩 28 Live Interactive Simulators

### Part I: Application & Transport Architecture (Ch 01–07)
1. **Protocol Layering & Header Dissector**: Multi-layer L2–L5 encapsulation & decapsulation breakdown.
2. **DNS & Hierarchical Resolution**: Root hints, TLD authoritative queries, and iterative recursion.
3. **HTTP/1.1 vs HTTP/2 vs HTTP/3**: Head-of-line blocking, TCP stream stalls vs QUIC independent UDP streams.
4. **TLS 1.3 Cryptographic Handshake**: 1-RTT ephemeral Diffie-Hellman key exchange and transcript secrets.
5. **Transport Layer Multiplexing**: 4-tuple (`SrcIP`, `SrcPort`, `DstIP`, `DstPort`) socket demux table.
6. **UDP vs TCP**: Unreliable datagram streams vs ordered reliable byte-stream state machines.
7. **Sliding Window & Pipelining**: Go-Back-N vs Selective Repeat packet buffer pipelines.

### Part II: TCP Mechanics, Congestion & Flow (Ch 08–13 + Hero)
- **Hero: The Unified TCP Congestion Control Engine**: Interactive AIMD (Reno), Cubic, and BBR v3 bandwidth vs delay simulator.
8. **TCP Finite State Machine (FSM)**: 11-state transition lifecycle (`SYN-SENT`, `ESTABLISHED`, `FIN-WAIT`, `TIME-WAIT`).
9. **Flow Control & Sliding Window (rwnd)**: Receiver buffer advertisements and zero-window probing.
10. **RTT Estimation & Dynamic RTO**: Jacobson/Karels exponentially weighted moving averages and safety variance.
11. **Bufferbloat & Active Queue Management**: Tail-drop latency death spirals vs CoDel / RED drop curves.
12. **SYN Flood Protection & SYN Cookies**: Cryptographic 32-bit sequence numbers preventing kernel backlog exhaustion.

### Part III: Network Layer, Addressing & Routing (Ch 14–21)
13. **IPv4 Addressing & CIDR Subnetting**: Bitwise prefix masks, broadcast boundaries, and host capacities.
14. **NAT & Port Address Translation (NAPT)**: Stateful translation tables mapping private `192.168.x.x` to public WAN IPs.
15. **IPv6 Architecture & SLAAC**: 128-bit address representation, EUI-64 MAC synthesis, and Stateless Address Autoconfiguration.
16. **Router Architecture & Switch Fabrics**: Input port FIFO queuing, Head-of-Line blocking, crossbar cross-points, and virtual output queuing (VOQ).
17. **Longest Prefix Match (LPM) via Radix Trie**: 32-bit binary trie traversal for line-rate routing lookups.
18. **Intra-Domain Link-State Routing (OSPF / Dijkstra)**: Priority-queue shortest path first calculation with edge weights.
19. **Distance-Vector Routing & Bellman-Ford**: Iterative neighbor updates, split horizon, and count-to-infinity mitigation.
20. **Inter-Domain Routing (BGP & AS-Path)**: Path-vector policy propagation, AS-path prepending, and transit vs peering rules.

### Part IV: Link Layer, Medium Access & Modern Systems (Ch 22–28)
21. **Link-Layer Framing & ARP Resolution**: L2 Ethernet frame delivery and ARP broadcast request/reply caching.
22. **Ethernet Switching & Spanning Tree Protocol (STP)**: Bridge Protocol Data Units (BPDUs), root bridge elections, and loop-free port blocking.
23. **Wireless LANs & CSMA/CA**: Carrier sensing, Exponential Backoff, DIFS/SIFS intervals, and RTS/CTS handshake.
24. **Error Detection via Cyclic Redundancy Check (CRC)**: Polynomial binary modulo-2 division generating frame check sequences.
25. **Programmable Data Planes & eBPF / XDP**: Kernel network stack bypass with sub-microsecond in-driver packet filters.
26. **Software-Defined Networking (SDN) & OpenFlow**: Centralized controller, match-action pipeline tables, and separation of control vs data planes.
27. **Physical Layer Fundamentals & Optical Latency**: Fiber refractive index ($c/n$), speed-of-light propagation delays across global subsea cables.

---

## 🧪 Automated Headless Audit Harness

Run the built-in headless test harness across 4 viewports (320px mobile, 480px, 768px tablet, 1200px desktop):

```bash
npm test
```

Audits:
- Complete DOM mounting of all 28 visualizers.
- Event listener triggers (every button, slider, and selector fires without exceptions).
- Finite coordinate math (zero `NaN`, `Infinity`, or unbounded layout regressions).
- High-DPI canvas backing store scaling.

---

## 🚀 Deployment & Static Serving

The project adheres to strict **zero-dependency web standards**:
- Pure HTML5, CSS3, and modern ES6+ JavaScript.
- No Node.js runtime required to serve.
- Compatible with any static file server:

```bash
# Preview locally
python3 -m http.server 8080
```
