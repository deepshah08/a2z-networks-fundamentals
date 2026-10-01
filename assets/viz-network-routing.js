/* ==========================================================================
   Computer Networks, Packet by Packet — Network Layer & Routing (viz-network-routing.js)
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * 13. IPv4 CIDR Calculator & Subnet Slicer
   * -------------------------------------------------------------------------- */
  OS.register('cidrCalc', function (host) {
    let prefix = 24; // /24 default
    let baseIp = '192.168.1.0';

    const controls = OS.controls(host);
    OS.slider(controls, {
      id: 'cidr-prefix-slider',
      label: 'CIDR Prefix Length:',
      min: 16,
      max: 30,
      step: 1,
      value: prefix,
      format: (v) => `/${v}`,
      onInput: (v) => { prefix = v; render(); }
    });

    OS.button(controls, 'Class C (/24)', () => { prefix = 24; render(); });
    OS.button(controls, 'Small Subnet (/28)', () => { prefix = 28; render(); });
    OS.button(controls, 'Datacenter VPC (/16)', () => { prefix = 16; render(); });

    const cv = OS.canvas(host, {
      height: 190,
      label: 'IPv4 CIDR network and host bit breakdown',
      draw: (ctx, w, h) => {
        const netBits = prefix;
        const hostBits = 32 - prefix;
        const totalHosts = Math.pow(2, hostBits);
        const usableHosts = Math.max(0, totalHosts - 2);

        // 32-bit bar representation
        const barY = 30;
        const barW = w - 50;
        const netW = (barW * netBits) / 32;
        const hostW = barW - netW;

        // Network Bits (Accent)
        ctx.fillStyle = OS.rgba(OS.C.accent, 0.25);
        ctx.strokeStyle = OS.C.accent;
        ctx.lineWidth = 1.5;
        ctx.roundRect(25, barY, netW, 55, [6, 0, 0, 6]);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(`NETWORK BITS (${netBits} bits)`, 35, barY + 28);
        ctx.font = OS.font(9, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('Fixed Subnet Routing Prefix', 35, barY + 46);

        // Host Bits (Teal)
        ctx.fillStyle = OS.rgba(OS.C.teal, 0.25);
        ctx.strokeStyle = OS.C.teal;
        ctx.lineWidth = 1.5;
        ctx.roundRect(25 + netW, barY, hostW, 55, [0, 6, 6, 0]);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.teal;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(`HOST BITS (${hostBits} bits)`, 25 + netW + 10, barY + 28);
        ctx.font = OS.font(9, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`${usableHosts.toLocaleString()} Usable IPs`, 25 + netW + 10, barY + 46);

        // Subnet Details Box
        const detY = 105;
        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.roundRect(25, detY, w - 50, 65, 6);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 500);
        ctx.fillText(`Prefix: 192.168.1.0/${prefix} · Total Addresses: ${totalHosts.toLocaleString()}`, 35, detY + 26);
        ctx.fillText(`Usable Host Range: 192.168.1.1 ➔ 192.168.1.${Math.min(254, totalHosts - 2)} · Broadcast: 192.168.1.${totalHosts - 1}`, 35, detY + 48);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      const hostBits = 32 - prefix;
      const usable = Math.max(0, Math.pow(2, hostBits) - 2);
      readout.innerHTML = `
        <b>Subnet Math:</b> <code>2^(32 - ${prefix}) - 2 = ${usable.toLocaleString()} usable host addresses</code>.<br>
        Two addresses are always reserved: the all-zeros <b>Network Address</b> and the all-ones <b>Directed Broadcast Address</b>.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 14. NAT (Network Address Translation) State Table
   * -------------------------------------------------------------------------- */
  OS.register('natTranslator', function (host) {
    const mappings = [
      { intIp: '192.168.1.100', intPort: 52000, pubPort: 61001, dstIp: '142.250.190.46', dstPort: 443 },
      { intIp: '192.168.1.104', intPort: 48900, pubPort: 61002, dstIp: '104.21.48.2', dstPort: 80 }
    ];

    let lastFlow = 0;

    const controls = OS.controls(host);
    OS.button(controls, 'Host 100 Outbound HTTP (Port 52000)', () => {
      lastFlow = 0; render();
    }, { primary: true });

    OS.button(controls, 'Host 104 Outbound HTTPS (Port 48900)', () => {
      lastFlow = 1; render();
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'Network address translation state table lookup',
      draw: (ctx, w, h) => {
        const cur = mappings[lastFlow];

        // LAN Side (Private RFC 1918)
        ctx.fillStyle = OS.rgba(OS.C.accent, 0.1);
        ctx.strokeStyle = OS.C.accent;
        ctx.lineWidth = 1.5;
        ctx.roundRect(25, 25, 170, 75, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('LAN PRIVATE HOST', 35, 45);
        ctx.font = OS.font(10, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`IP: ${cur.intIp}`, 35, 68);
        ctx.fillText(`Src Port: ${cur.intPort}`, 35, 88);

        // NAT Router in Center
        const natX = 210;
        const natW = Math.min(240, w - natX - 195);
        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.roundRect(natX, 25, natW, 75, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = OS.C.amber;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('NAT ROUTER (WAN: 203.0.113.8)', natX + 10, 45);
        ctx.font = OS.font(9, 'mono', 500);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Rewrite Port: ${cur.intPort} ➔ ${cur.pubPort}`, natX + 10, 68);
        ctx.fillText('Translation Table Active', natX + 10, 88);

        // WAN Side (Public Web)
        const wanX = natX + natW + 15;
        ctx.fillStyle = OS.rgba(OS.C.teal, 0.1);
        ctx.strokeStyle = OS.C.teal;
        ctx.lineWidth = 1.5;
        ctx.roundRect(wanX, 25, Math.min(180, w - wanX - 25), 75, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = OS.C.teal;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('WAN INTERNET', wanX + 10, 45);
        ctx.font = OS.font(10, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Dest: ${cur.dstIp}`, wanX + 10, 68);
        ctx.fillText(`Dst Port: ${cur.dstPort}`, wanX + 10, 88);

        // NAT Table Entry Row Below
        ctx.fillStyle = OS.rgba(OS.C.amber, 0.08);
        ctx.strokeStyle = OS.C.amber;
        ctx.roundRect(25, 115, w - 50, 45, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = OS.C.amber;
        ctx.font = OS.font(10, 'mono', 600);
        ctx.fillText(`NAT TABLE ENTRY: ${cur.intIp}:${cur.intPort}  ⇄  203.0.113.8:${cur.pubPort}  ⇄  ${cur.dstIp}:${cur.dstPort}`, 35, 142);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      const cur = mappings[lastFlow];
      readout.innerHTML = `
        <b>NAPT (Port Translation):</b> The router rewrites the source IP to public <code>203.0.113.8</code> and maps the source port to <code>${cur.pubPort}</code>.<br>
        When external packets return to port ${cur.pubPort}, the NAT router consults its table, rewrites the destination back to <code>${cur.intIp}:${cur.intPort}</code>, and forwards internally.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 15. IPv6 Address Formatting & SLAAC EUI-64 Derivation
   * -------------------------------------------------------------------------- */
  OS.register('ipv6Slaac', function (host) {
    const rawMac = 'D8:3A:DD:4A:21:00';
    let compressMode = true;

    const controls = OS.controls(host);
    OS.button(controls, 'Toggle Zero Compression (::)', () => {
      compressMode = !compressMode;
      render();
    }, { primary: true });

    const cv = OS.canvas(host, {
      height: 190,
      label: 'IPv6 address compression and SLAAC derivation',
      draw: (ctx, w, h) => {
        // Full uncompressed
        const full = '2001:0db8:0000:0000:0000:ff00:0042:8329';
        // Compressed
        const comp = '2001:db8::ff00:42:8329';

        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.roundRect(25, 25, w - 50, 60, 6);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(compressMode ? 'RFC 5952 CANONICAL COMPRESSED FORMAT' : 'UNCOMPRESSED 128-BIT HEX FORMAT', 35, 45);

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(13, 'mono', 600);
        ctx.fillText(compressMode ? comp : full, 35, 70);

        // SLAAC EUI-64 Box Below
        ctx.fillStyle = OS.rgba(OS.C.teal, 0.1);
        ctx.strokeStyle = OS.C.teal;
        ctx.roundRect(25, 100, w - 50, 75, 6);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.teal;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('STATELESS ADDRESS AUTOCONFIGURATION (SLAAC / EUI-64)', 35, 120);

        ctx.font = OS.font(10, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`• Hardware MAC: ${rawMac}  ➔  Insert 0xFFFE into middle + flip 7th bit`, 35, 142);
        ctx.fillText('• Derived Link-Local: fe80::da3a:ddff:fe4a:2100/64 (Zero DHCP server needed!)', 35, 162);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>IPv6 Space:</b> 128 bits yields <b>3.4 × 10^38 addresses</b> (enough to assign billions of IPs to every grain of sand on Earth).<br>
        RFC 5952 Rules: Leading zeros in 16-bit blocks are omitted, and the longest run of consecutive zero blocks is replaced exactly once by <code>::</code>.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 16. Router Crossbar Switching Fabric & Queueing
   * -------------------------------------------------------------------------- */
  OS.register('routerCrossbar', function (host) {
    let activeLines = [
      { inPort: 0, outPort: 2 },
      { inPort: 1, outPort: 0 },
      { inPort: 2, outPort: 3 }
    ];

    const controls = OS.controls(host);
    OS.button(controls, 'Switch Step: Crossbar Shift ▶', () => {
      activeLines = [
        { inPort: 0, outPort: (activeLines[0].outPort + 1) % 4 },
        { inPort: 1, outPort: (activeLines[1].outPort + 1) % 4 },
        { inPort: 2, outPort: (activeLines[2].outPort + 1) % 4 }
      ];
      render();
    }, { primary: true });

    const cv = OS.canvas(host, {
      height: 200,
      label: 'Router crossbar switching fabric',
      draw: (ctx, w, h) => {
        const startX = 60;
        const startY = 40;
        const gridW = 35;

        // Draw Crossbar Grid Lines
        ctx.strokeStyle = OS.C.line;
        ctx.lineWidth = 1;
        for (let r = 0; r < 4; r++) {
          ctx.beginPath();
          ctx.moveTo(startX, startY + r * gridW);
          ctx.lineTo(startX + 3 * gridW, startY + r * gridW);
          ctx.stroke();

          ctx.fillStyle = OS.C.accent;
          ctx.font = OS.font(10, 'mono', 600);
          ctx.fillText(`In ${r}`, startX - 35, startY + r * gridW + 4);
        }

        for (let c = 0; c < 4; c++) {
          ctx.beginPath();
          ctx.moveTo(startX + c * gridW, startY);
          ctx.lineTo(startX + c * gridW, startY + 3 * gridW);
          ctx.stroke();

          ctx.fillStyle = OS.C.teal;
          ctx.font = OS.font(10, 'mono', 600);
          ctx.fillText(`Out ${c}`, startX + c * gridW - 14, startY - 12);
        }

        // Draw Active Crossbar Crosspoints
        activeLines.forEach(l => {
          const cx = startX + l.outPort * gridW;
          const cy = startY + l.inPort * gridW;
          ctx.fillStyle = OS.C.rose;
          ctx.beginPath();
          ctx.arc(cx, cy, 6, 0, Math.PI * 2);
          ctx.fill();
        });

        // Detail callout on right
        const rX = startX + 4 * gridW + 40;
        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.roundRect(rX, 25, w - rX - 25, 145, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('CROSSBAR FABRIC ADVANTAGE', rX + 12, 48);

        ctx.font = OS.font(10, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('• Up to N packets forwarded simultaneously', rX + 12, 75);
        ctx.fillText('• Zero bus memory contention', rX + 12, 98);
        ctx.fillText('• Terabit line rates achieved in hardware', rX + 12, 120);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>Hardware Switching Fabric:</b> Unlike software routers where all packets share a central CPU memory bus, hardware crossbar fabrics allow multiple input-output port pairs to communicate in parallel as long as they don't target the same output line.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 17. Radix Trie Longest Prefix Match (LPM) Walk
   * -------------------------------------------------------------------------- */
  OS.register('radixTrie', function (host) {
    const table = [
      { prefix: '192.168.0.0/16', iface: 'eth0 (Internal LAN)' },
      { prefix: '192.168.1.0/24', iface: 'eth1 (Office Wi-Fi)' },
      { prefix: '192.168.1.128/25', iface: 'eth2 (Server VLAN - Longest Match!)' },
      { prefix: '0.0.0.0/0', iface: 'eth3 (Default WAN Gateway)' }
    ];

    let destIp = '192.168.1.140';

    const controls = OS.controls(host);
    OS.button(controls, 'Lookup 192.168.1.140 (Matches /25)', () => {
      destIp = '192.168.1.140'; render();
    }, { primary: true });

    OS.button(controls, 'Lookup 192.168.1.20 (Matches /24)', () => {
      destIp = '192.168.1.20'; render();
    });

    OS.button(controls, 'Lookup 8.8.8.8 (Default Gateway /0)', () => {
      destIp = '8.8.8.8'; render();
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'Radix trie longest prefix match lookup',
      draw: (ctx, w, h) => {
        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.roundRect(25, 20, w - 50, 140, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(`ROUTING TABLE FORWARDING ENTRIES (Destination: ${destIp})`, 35, 42);

        table.forEach((e, idx) => {
          const y = 62 + idx * 24;
          const isLpm = (destIp === '192.168.1.140' && idx === 2) ||
            (destIp === '192.168.1.20' && idx === 1) ||
            (destIp === '8.8.8.8' && idx === 3);

          ctx.fillStyle = isLpm ? OS.C.green : OS.C.muted;
          ctx.font = OS.font(10, 'mono', isLpm ? 600 : 400);
          ctx.fillText(`${isLpm ? '➔ ' : '  '}${e.prefix.padEnd(20)} ➔ Next Hop: ${e.iface}`, 35, y);
        });
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>Longest Prefix Match (LPM) Rule:</b> When multiple routing table entries match the destination IP, the router <b>always selects the most specific prefix (longest prefix length)</b>.<br>
        For <code>192.168.1.140</code>, both <code>/16</code>, <code>/24</code>, and <code>/25</code> match. The router chooses <code>/25</code> because it specifies the narrowest subnet.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 18. Intra-Domain Routing: Dijkstra's Link-State SPF Algorithm
   * -------------------------------------------------------------------------- */
  OS.register('dijkstraOspf', function (host) {
    const nodes = [
      { id: 'u', x: 50, y: 90 },
      { id: 'v', x: 150, y: 40 },
      { id: 'x', x: 150, y: 140 },
      { id: 'w', x: 250, y: 50 },
      { id: 'y', x: 250, y: 130 }
    ];

    let currentStep = 0;
    const steps = [
      { step: 0, visited: ['u'], desc: 'Initialization: Set of visited nodes N\' = {u}. Distance to v=2, x=1, others=∞.' },
      { step: 1, visited: ['u', 'x'], desc: 'Min distance is x (cost 1). Add x to N\'. Update v through x (cost 1+2=3 > 2), update y (cost 1+1=2).' },
      { step: 2, visited: ['u', 'x', 'v'], desc: 'Min distance is v (cost 2) and y (cost 2). Add v. Update w (cost 2+3=5).' },
      { step: 3, visited: ['u', 'x', 'v', 'y'], desc: 'Add y. Update w through y (cost 2+1=3 < 5). Shortest path to w improves!' },
      { step: 4, visited: ['u', 'x', 'v', 'y', 'w'], desc: 'Complete! Shortest Path Tree computed for all destination nodes.' }
    ];

    const controls = OS.controls(host);
    OS.button(controls, 'Step Dijkstra Algorithm ▶', () => {
      currentStep = (currentStep + 1) % steps.length;
      render();
    }, { primary: true });

    OS.button(controls, 'Reset Graph', () => {
      currentStep = 0; render();
    });

    const cv = OS.canvas(host, {
      height: 190,
      label: 'Dijkstra shortest path algorithm graph',
      draw: (ctx, w, h) => {
        const s = steps[currentStep];

        // Draw Links
        ctx.strokeStyle = OS.C.line;
        ctx.lineWidth = 1.5;
        const edges = [
          [0, 1, '2'], [0, 2, '1'], [1, 2, '2'], [1, 3, '3'], [2, 4, '1'], [4, 3, '1']
        ];
        edges.forEach(([a, b, weight]) => {
          ctx.beginPath();
          ctx.moveTo(nodes[a].x, nodes[a].y);
          ctx.lineTo(nodes[b].x, nodes[b].y);
          ctx.stroke();

          ctx.fillStyle = OS.C.muted;
          ctx.font = OS.font(9, 'mono', 500);
          ctx.fillText(weight, (nodes[a].x + nodes[b].x) / 2, (nodes[a].y + nodes[b].y) / 2 - 4);
        });

        // Draw Nodes
        nodes.forEach(n => {
          const isVisited = s.visited.includes(n.id);
          ctx.fillStyle = isVisited ? OS.C.accent : OS.C.sunk;
          ctx.strokeStyle = isVisited ? OS.C.accent : OS.C.line;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();

          ctx.fillStyle = isVisited ? '#ffffff' : OS.C.ink;
          ctx.font = OS.font(11, 'mono', 600);
          ctx.fillText(n.id, n.x - 4, n.y + 4);
        });

        // Step explanation box on right
        const infoX = 290;
        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.roundRect(infoX, 20, w - infoX - 25, 150, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(`DIJKSTRA STEP ${s.step}/4`, infoX + 12, 42);

        ctx.font = OS.font(10, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Visited Set: {${s.visited.join(', ')}}`, infoX + 12, 68);

        ctx.font = OS.font(9, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText(s.desc, infoX + 12, 95);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>Link-State (OSPF) Protocol:</b> Every router floods the state of its links to all routers in the autonomous system, giving every node an identical topological map. Each router independently executes Dijkstra's algorithm to compute the shortest-path forwarding table.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 19. Distance-Vector Count-to-Infinity & Poison Reverse
   * -------------------------------------------------------------------------- */
  OS.register('distanceVector', function (host) {
    let linkBroken = false;
    let countToInfStep = 0;

    const controls = OS.controls(host);
    OS.button(controls, 'Break Link X-Y (Trigger Failure)', () => {
      linkBroken = true;
      countToInfStep = 1;
      render();
    }, { primary: true });

    OS.button(controls, 'Step Distance-Vector Update ▶', () => {
      if (linkBroken) countToInfStep = Math.min(16, countToInfStep + 2);
      render();
    });

    OS.button(controls, 'Reset Network Link', () => {
      linkBroken = false; countToInfStep = 0; render();
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'Distance vector routing loop and count to infinity',
      draw: (ctx, w, h) => {
        const cost = linkBroken ? Math.min(16, 1 + countToInfStep) : 1;

        ctx.fillStyle = linkBroken ? OS.rgba(OS.C.rose, 0.12) : OS.rgba(OS.C.green, 0.12);
        ctx.strokeStyle = linkBroken ? OS.C.rose : OS.C.green;
        ctx.lineWidth = 2;
        ctx.roundRect(25, 25, w - 50, 120, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = linkBroken ? OS.C.rose : OS.C.green;
        ctx.font = OS.font(12, 'mono', 600);
        ctx.fillText(linkBroken ? `ROUTING LOOP: COUNT-TO-INFINITY IN PROGRESS (Metric = ${cost})` : 'DISTANCE-VECTOR ROUTING STABLE', 35, 52);

        ctx.font = OS.font(10, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Node X claims route to Z through Y (Cost: ${cost})`, 35, 80);
        ctx.fillText(`Node Y claims route to Z through X (Cost: ${cost + 1})`, 35, 102);
        ctx.fillText(cost >= 16 ? 'Poison Reverse / Max Metric 16 reached: Link declared unreachable (Infinity)!' : 'Packets bounce endlessly between X and Y until TTL expires!', 35, 124);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>Count-to-Infinity Problem:</b> In Bellman-Ford distance-vector protocols (RIP), good news travels fast, but bad news travels slowly.<br>
        When a link breaks, neighboring nodes fool each other into thinking they still possess an alternate path, slowly incrementing distance vectors up to $\\infty = 16$.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 20. BGP AS-Path Vector Loop Detection
   * -------------------------------------------------------------------------- */
  OS.register('bgpAsPath', function (host) {
    let loopDetected = false;

    const controls = OS.controls(host);
    OS.button(controls, 'Normal Path Advertisement', () => {
      loopDetected = false; render();
    }, { primary: true });

    OS.button(controls, 'Inject Loop (AS 100 in Path)', () => {
      loopDetected = true; render();
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'BGP autonomous system path vector',
      draw: (ctx, w, h) => {
        const path = loopDetected ? '[AS 300, AS 200, AS 100]' : '[AS 300, AS 200]';

        ctx.fillStyle = loopDetected ? OS.rgba(OS.C.rose, 0.15) : OS.rgba(OS.C.teal, 0.15);
        ctx.strokeStyle = loopDetected ? OS.C.rose : OS.C.teal;
        ctx.lineWidth = 2;
        ctx.roundRect(25, 25, w - 50, 120, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = loopDetected ? OS.C.rose : OS.C.teal;
        ctx.font = OS.font(12, 'mono', 600);
        ctx.fillText(`LOCAL BGP ROUTER IN AS 100 (BGP BGP-4)`, 35, 52);

        ctx.font = OS.font(11, 'mono', 500);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Received BGP Advertisement for Prefix: 140.82.112.0/20`, 35, 80);
        ctx.fillText(`AS-PATH Attribute: ${path}`, 35, 104);

        ctx.fillStyle = loopDetected ? OS.C.rose : OS.C.green;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(loopDetected ? '❌ LOOP DETECTED: AS 100 is already in AS-PATH! Advertisement silently DROPPED.' : '✓ VALID ROUTE: AS 100 not in path. Prefix accepted and added to FIB.', 35, 128);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>BGP Loop Elimination Rule:</b> Unlike interior routing protocols, BGP attaches the entire sequence of Autonomous Systems (the <code>AS-PATH</code> attribute) to every advertised prefix.<br>
        If an AS sees its own Autonomous System number in the AS-PATH, it knows the route has looped and immediately rejects it!
      `;
    }
    render();
  });

})();
