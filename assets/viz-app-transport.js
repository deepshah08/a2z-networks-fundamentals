/* ==========================================================================
   Computer Networks, Packet by Packet — Application & Transport Visualizations
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * 1. Protocol Layering & Header Dissector (Encapsulation)
   * -------------------------------------------------------------------------- */
  OS.register('headerDissector', function (host) {
    const layers = [
      { name: 'Layer 5: Application (HTTP/JSON)', color: OS.C.violet, size: 280, fields: 'GET /api/v1/metrics HTTP/1.1\\r\\nHost: api.internal\\r\\n...' },
      { name: 'Layer 4: Transport (TCP)', color: OS.C.teal, size: 20, fields: 'Src Port: 54120 · Dst Port: 443 · Seq: 1042 · Ack: 3001 · Flags: [ACK, PSH] · Window: 65535' },
      { name: 'Layer 3: Network (IPv4)', color: OS.C.accent, size: 20, fields: 'Src: 192.168.1.104 · Dst: 104.21.48.2 · TTL: 64 · Protocol: 6 (TCP) · Header Checksum: 0x4A12' },
      { name: 'Layer 2: Link (Ethernet II)', color: OS.C.amber, size: 14, fields: 'Src MAC: D8:3A:DD:4A:21:00 · Dst MAC: F0:9F:C2:11:88:99 · EtherType: 0x0800 (IPv4)' }
    ];

    let activeLayer = 1; // 0..3

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Inspect Header Layer',
      options: layers.map((l, idx) => ({ label: `L${5 - idx}`, value: idx })),
      value: activeLayer,
      onChange: (v) => { activeLayer = parseInt(v); render(); }
    });

    OS.button(controls, 'Encapsulate ➔', () => {
      activeLayer = Math.min(layers.length - 1, activeLayer + 1);
      render();
    });

    OS.button(controls, 'Decapsulate ➔', () => {
      activeLayer = Math.max(0, activeLayer - 1);
      render();
    });

    const cv = OS.canvas(host, {
      height: 220,
      label: 'Protocol encapsulation and header dissection',
      draw: (ctx, w, h) => {
        const cur = layers[activeLayer];
        const barY = 25;
        const totalW = w - 50;

        // Draw Onion Packet Representation
        let bx = 25;
        const sliceWidths = [0.15, 0.20, 0.20, 0.45]; // Link, IP, TCP, Payload
        const layerIndices = [3, 2, 1, 0]; // L2 -> L3 -> L4 -> L5

        layerIndices.forEach((layerIdx, i) => {
          const sw = totalW * sliceWidths[i];
          const isInspected = (layerIdx === activeLayer);
          const l = layers[layerIdx];

          ctx.fillStyle = isInspected ? OS.rgba(l.color, 0.25) : OS.rgba(OS.C.sunk, 0.7);
          ctx.strokeStyle = isInspected ? l.color : OS.C.line;
          ctx.lineWidth = isInspected ? 2.5 : 1;
          ctx.roundRect(bx, barY, sw - 6, 45, 6);
          ctx.fill(); ctx.stroke();

          ctx.fillStyle = isInspected ? l.color : OS.C.muted;
          ctx.font = OS.font(sw < 60 ? 9 : 11, 'mono', 600);
          const label = sw < 60 ? `L${5 - layerIdx}` : l.name.split(':')[1].trim().split(' ')[0];
          ctx.fillText(label, bx + 8, barY + 28);

          bx += sw;
        });

        // Detail Inspector Box
        const insY = 85;
        ctx.fillStyle = OS.rgba(cur.color, 0.08);
        ctx.strokeStyle = cur.color;
        ctx.lineWidth = 1.5;
        ctx.roundRect(25, insY, w - 50, 115, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = cur.color;
        ctx.font = OS.font(12, 'mono', 600);
        ctx.fillText(`HEADER INSPECTOR: ${cur.name} (${cur.size} bytes)`, 35, insY + 26);

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 400);
        ctx.fillText(cur.fields, 35, insY + 54);

        ctx.fillStyle = OS.C.muted;
        ctx.font = OS.font(10, 'sans', 400);
        const desc = activeLayer === 3 ? 'Frame preamble and MAC addressing traversed by local network switches.' :
          activeLayer === 2 ? 'IPv4 packet routed across Internet autonomous systems using routing tables.' :
          activeLayer === 1 ? 'End-to-end transport protocol ensuring in-order delivery and congestion control.' :
          'Application data payload interpreted by web browser or HTTP client.';
        ctx.fillText(desc, 35, insY + 84);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      const l = layers[activeLayer];
      readout.innerHTML = `
        <b>Active Inspection:</b> <span class="hl">${l.name}</span> (${l.size} bytes)<br>
        <span style="font-size:0.75rem; color:var(--muted)">Encapsulation Principle: As data travels down the stack, each layer wraps the upper protocol's Payload Unit (PDU) inside its own header. Switches inspect Layer 2; Routers inspect Layer 3; End-hosts inspect Layer 4 and 5.</span>
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 2. DNS Recursive & Iterative Resolution Stepper
   * -------------------------------------------------------------------------- */
  OS.register('dnsResolver', function (host) {
    const steps = [
      { step: 1, from: 'Client Host', to: 'Local Recursive Resolver (8.8.8.8)', action: 'DNS Query (A: api.github.com)', cache: 'MISS', rtt: 2 },
      { step: 2, from: 'Recursive Resolver', to: 'Root Nameserver (a.root-servers.net)', action: 'Query for api.github.com -> Returns referral to .com TLD', cache: 'REFERRAL', rtt: 18 },
      { step: 3, from: 'Recursive Resolver', to: '.com TLD Nameserver (a.gtld-servers.net)', action: 'Query for api.github.com -> Returns NS for github.com', cache: 'REFERRAL', rtt: 35 },
      { step: 4, from: 'Recursive Resolver', to: 'Authoritative NS (ns-1.github.com)', action: 'Query for api.github.com -> Returns A Record: 140.82.114.4', cache: 'HIT (TTL 300s)', rtt: 52 },
      { step: 5, from: 'Local Recursive Resolver', to: 'Client Host', action: 'Final Answer: 140.82.114.4 cached locally', cache: 'STORED', rtt: 55 }
    ];

    let currentStep = 0;
    let cached = false;

    const controls = OS.controls(host);
    OS.button(controls, 'Next Step ▶', () => {
      currentStep = (currentStep + 1) % steps.length;
      render();
    }, { primary: true });

    OS.button(controls, 'Simulate Cached Query (0 RTT)', () => {
      cached = !cached;
      currentStep = cached ? 4 : 0;
      render();
    });

    OS.button(controls, 'Reset Flow', () => {
      currentStep = 0; cached = false;
      render();
    });

    const cv = OS.canvas(host, {
      height: 210,
      label: 'DNS hierarchical resolution path',
      draw: (ctx, w, h) => {
        const s = steps[currentStep];
        const nodes = [
          { name: 'Client Host', x: 35, y: 120, color: OS.C.user },
          { name: 'Local Resolver', x: w * 0.28, y: 120, color: OS.C.accent },
          { name: 'Root NS (.)', x: w * 0.52, y: 45, color: OS.C.teal },
          { name: '.com TLD', x: w * 0.72, y: 90, color: OS.C.amber },
          { name: 'Auth NS (github)', x: w * 0.88, y: 155, color: OS.C.violet }
        ];

        // Draw connections
        ctx.strokeStyle = OS.C.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y); ctx.lineTo(nodes[1].x, nodes[1].y);
        ctx.moveTo(nodes[1].x, nodes[1].y); ctx.lineTo(nodes[2].x, nodes[2].y);
        ctx.moveTo(nodes[1].x, nodes[1].y); ctx.lineTo(nodes[3].x, nodes[3].y);
        ctx.moveTo(nodes[1].x, nodes[1].y); ctx.lineTo(nodes[4].x, nodes[4].y);
        ctx.stroke();

        // Draw nodes
        nodes.forEach((n, idx) => {
          const isActive = (s.from.includes(n.name.split(' ')[0]) || s.to.includes(n.name.split(' ')[0]));
          ctx.fillStyle = isActive ? OS.rgba(n.color, 0.2) : OS.C.sunk;
          ctx.strokeStyle = isActive ? n.color : OS.C.line;
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 22, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();

          ctx.fillStyle = isActive ? n.color : OS.C.ink;
          ctx.font = OS.font(9, 'mono', 600);
          ctx.textAlign = 'center';
          ctx.fillText(n.name, n.x, n.y + 36);
        });
        ctx.textAlign = 'left';

        // Step callout box
        ctx.fillStyle = OS.rgba(OS.C.accent, 0.08);
        ctx.strokeStyle = OS.C.accent;
        ctx.lineWidth = 1;
        ctx.roundRect(25, 165, w - 50, 36, 6);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(10, 'mono', 600);
        ctx.fillText(`Step ${s.step}/5: [${s.from} ➔ ${s.to}]`, 35, 187);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      const s = steps[currentStep];
      readout.innerHTML = `
        <b>Current Transaction:</b> <span class="hl">${s.action}</span><br>
        • <b>Status:</b> ${s.cache} | • <b>Elapsed RTT:</b> ~${s.rtt} ms | • <b>Protocol:</b> UDP Port 53 (or DoH 443)<br>
        <span style="font-size:0.75rem; color:var(--muted)">Iterative vs Recursive: The client queries its local resolver recursively. The resolver queries the Root, TLD, and Authoritative hierarchy iteratively to build the complete record chain.</span>
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 3. Head-of-Line (HOL) Blocking Arena: HTTP/1.1 vs HTTP/2 vs HTTP/3 QUIC
   * -------------------------------------------------------------------------- */
  OS.register('holBlocking', function (host) {
    let mode = 'http2'; // 'http1', 'http2', 'http3'
    let packetDropped = false;

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Protocol Generation',
      options: [
        { label: 'HTTP/1.1 (Pipelining)', value: 'http1' },
        { label: 'HTTP/2 (Single TCP Stream)', value: 'http2' },
        { label: 'HTTP/3 (QUIC over UDP)', value: 'http3' }
      ],
      value: mode,
      onChange: (v) => { mode = v; packetDropped = false; render(); }
    });

    OS.button(controls, 'Inject Packet Loss on Stream 1', () => {
      packetDropped = true;
      render();
    }, { primary: true });

    OS.button(controls, 'Reset Streams', () => {
      packetDropped = false;
      render();
    });

    const cv = OS.canvas(host, {
      height: 200,
      label: 'Head of line blocking protocol comparison',
      draw: (ctx, w, h) => {
        const streams = [
          { id: 'Stream 1 (HTML)', color: OS.C.accent, blocked: packetDropped },
          { id: 'Stream 2 (CSS)', color: OS.C.teal, blocked: (mode === 'http1' || (mode === 'http2' && packetDropped)) },
          { id: 'Stream 3 (Image JS)', color: OS.C.amber, blocked: (mode === 'http1' || (mode === 'http2' && packetDropped)) }
        ];

        const rowH = 42;
        streams.forEach((s, idx) => {
          const y = 25 + idx * (rowH + 12);
          ctx.fillStyle = s.blocked ? OS.rgba(OS.C.rose, 0.12) : OS.rgba(s.color, 0.15);
          ctx.strokeStyle = s.blocked ? OS.C.rose : s.color;
          ctx.lineWidth = s.blocked ? 2 : 1;
          ctx.roundRect(25, y, w - 50, rowH, 6);
          ctx.fill(); ctx.stroke();

          ctx.fillStyle = s.color;
          ctx.font = OS.font(11, 'mono', 600);
          ctx.fillText(s.id, 35, y + 26);

          ctx.fillStyle = s.blocked ? OS.C.rose : OS.C.green;
          ctx.font = OS.font(10, 'mono', 600);
          const status = s.blocked ?
            (idx === 0 ? '❌ PACKET DROPPED' : '⚠️ HOL BLOCKED (Stalled behind Stream 1)') :
            '✓ STREAMING DATA NORMALLY';
          ctx.fillText(status, w * 0.42, y + 26);
        });
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      if (mode === 'http3') {
        readout.innerHTML = `
          <b>HTTP/3 QUIC Invariant:</b> <span class="hl">Independent Byte Streams over UDP</span>.<br>
          When Stream 1 loses a packet, <b>only Stream 1 pauses</b> for retransmission. Stream 2 (CSS) and Stream 3 (Images) continue downloading at full line-rate with <b>zero Head-of-Line blocking</b>!
        `;
      } else if (mode === 'http2') {
        readout.innerHTML = `
          <b>HTTP/2 Trade-off:</b> Multiplexes all streams across a <b>single TCP connection</b>.<br>
          ${packetDropped ? '<b style="color:var(--rose)">TCP HOL BLOCKING:</b> Because TCP guarantees strict in-order byte delivery, a single dropped packet in Stream 1 halts ALL other multiplexed streams until TCP retransmits it!' : 'Streams multiplex cleanly until packet loss occurs on the wire.'}
        `;
      } else {
        readout.innerHTML = `
          <b>HTTP/1.1 Pipelining:</b> Requests must be responded to in strict FIFO order on each socket. If request 1 takes long, requests 2 and 3 stall completely at the application layer.
        `;
      }
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 4. TLS 1.3 Cryptographic Handshake & 0-RTT Stepper
   * -------------------------------------------------------------------------- */
  OS.register('tlsHandshake', function (host) {
    const steps = [
      { step: 1, title: 'Client Hello', cipher: 'TLS_AES_256_GCM_SHA384', desc: 'Client sends supported ciphers + Diffie-Hellman Key Share (ECDHE x25519) in 1 flight.' },
      { step: 2, title: 'Server Hello & Key Derivation', cipher: 'ECDHE Established', desc: 'Server selects cipher, sends its DH Key Share. Both compute Master Secret independently!' },
      { step: 3, title: 'Encrypted Certificate & Handshake Finished', cipher: 'AES-256-GCM Active', desc: 'Server encrypts its Certificate and Finished MAC. Handshake verified in 1-RTT.' },
      { step: 4, title: 'Application Data (Secure Stream)', cipher: 'Full Forward Secrecy', desc: 'Bi-directional encrypted application data streams begin after only 1 round-trip!' }
    ];

    let currentStep = 0;

    const controls = OS.controls(host);
    OS.button(controls, 'Next Handshake Flight ▶', () => {
      currentStep = (currentStep + 1) % steps.length;
      render();
    }, { primary: true });

    OS.button(controls, 'Reset Handshake', () => {
      currentStep = 0; render();
    });

    const cv = OS.canvas(host, {
      height: 190,
      label: 'TLS 1.3 cryptographic handshake flow',
      draw: (ctx, w, h) => {
        const s = steps[currentStep];
        const clientX = 45;
        const serverX = w - 45;

        // Vertical Lifelines
        ctx.strokeStyle = OS.C.line;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(clientX, 25); ctx.lineTo(clientX, 160);
        ctx.moveTo(serverX, 25); ctx.lineTo(serverX, 160);
        ctx.stroke();

        ctx.fillStyle = OS.C.user;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('CLIENT', clientX - 20, 20);

        ctx.fillStyle = OS.C.teal;
        ctx.fillText('SERVER', serverX - 25, 20);

        // Flight Arrows
        const yPos = [50, 80, 115, 145];
        for (let i = 0; i <= currentStep; i++) {
          const y = yPos[i];
          const isClientToServer = (i === 0 || i === 3);
          const startX = isClientToServer ? clientX : serverX;
          const endX = isClientToServer ? serverX : clientX;

          ctx.strokeStyle = (i === currentStep) ? OS.C.accent : OS.C.line;
          ctx.lineWidth = (i === currentStep) ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.moveTo(startX, y); ctx.lineTo(endX, y);
          ctx.stroke();

          // Arrow tip
          ctx.fillStyle = (i === currentStep) ? OS.C.accent : OS.C.line;
          ctx.beginPath();
          ctx.arc(endX, y, 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.font = OS.font(10, 'mono', 500);
          ctx.fillText(steps[i].title, w / 2 - 70, y - 6);
        }
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      const s = steps[currentStep];
      readout.innerHTML = `
        <b>Handshake Flight ${currentStep + 1}/4:</b> <span class="hl">${s.title}</span><br>
        • <b>Cipher State:</b> <code>${s.cipher}</code> | • <b>Detail:</b> ${s.desc}<br>
        <span style="font-size:0.75rem; color:var(--muted)">TLS 1.2 required 2 full RTTs before encryption began. TLS 1.3 bundles Diffie-Hellman key shares into the initial ClientHello, cutting latency in half (1-RTT).</span>
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 5. Socket 4-Tuple Demultiplexer
   * -------------------------------------------------------------------------- */
  OS.register('socketDemux', function (host) {
    const sockets = [
      { pid: 1044, proc: 'nginx (HTTPS)', lAddr: '192.168.1.10:443', rAddr: '104.28.1.5:51200', state: 'ESTABLISHED' },
      { pid: 1044, proc: 'nginx (HTTPS)', lAddr: '192.168.1.10:443', rAddr: '185.199.1.8:49920', state: 'ESTABLISHED' },
      { pid: 2190, proc: 'sshd (SSH)', lAddr: '192.168.1.10:22', rAddr: '10.0.0.4:58100', state: 'ESTABLISHED' }
    ];

    let query = { srcIp: '104.28.1.5', srcPort: 51200, dstIp: '192.168.1.10', dstPort: 443 };
    let matchedSocket = sockets[0];

    const controls = OS.controls(host);
    OS.button(controls, 'Incoming Packet: HTTPS Client A', () => {
      query = { srcIp: '104.28.1.5', srcPort: 51200, dstIp: '192.168.1.10', dstPort: 443 };
      matchedSocket = sockets[0];
      render();
    }, { primary: true });

    OS.button(controls, 'Incoming Packet: HTTPS Client B', () => {
      query = { srcIp: '185.199.1.8', srcPort: 49920, dstIp: '192.168.1.10', dstPort: 443 };
      matchedSocket = sockets[1];
      render();
    });

    OS.button(controls, 'Incoming Packet: SSH Admin', () => {
      query = { srcIp: '10.0.0.4', srcPort: 58100, dstIp: '192.168.1.10', dstPort: 22 };
      matchedSocket = sockets[2];
      render();
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'Kernel 4 tuple socket lookup',
      draw: (ctx, w, h) => {
        const rowH = 34;
        sockets.forEach((s, idx) => {
          const y = 20 + idx * (rowH + 10);
          const isMatch = (s === matchedSocket);

          ctx.fillStyle = isMatch ? OS.rgba(OS.C.accent, 0.2) : OS.C.sunk;
          ctx.strokeStyle = isMatch ? OS.C.accent : OS.C.line;
          ctx.lineWidth = isMatch ? 2 : 1;
          ctx.roundRect(25, y, w - 50, rowH, 6);
          ctx.fill(); ctx.stroke();

          ctx.fillStyle = isMatch ? OS.C.accent : OS.C.ink;
          ctx.font = OS.font(10, 'mono', 600);
          ctx.fillText(`PID ${s.pid} [${s.proc}]`, 35, y + 21);

          ctx.font = OS.font(9, 'mono', 400);
          ctx.fillStyle = OS.C.muted;
          ctx.fillText(`Local: ${s.lAddr} ⇄ Remote: ${s.rAddr}`, w * 0.38, y + 21);

          ctx.fillStyle = isMatch ? OS.C.green : OS.C.faint;
          ctx.font = OS.font(9, 'mono', 600);
          ctx.fillText(isMatch ? '◀ ROUTED MATCH' : s.state, w - 120, y + 21);
        });
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>Kernel Demux 4-Tuple:</b> <code>(${query.srcIp}:${query.srcPort} ➔ ${query.dstIp}:${query.dstPort})</code><br>
        Packets arriving at destination port 443 are cleanly separated into different socket file descriptors based on the client's unique ephemeral IP and port.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 6. UDP vs TCP Header Inspector
   * -------------------------------------------------------------------------- */
  OS.register('udpVsTcp', function (host) {
    let mode = 'tcp'; // 'tcp' or 'udp'

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Inspect Protocol Header',
      options: [
        { label: 'TCP Header (20 Bytes Min)', value: 'tcp' },
        { label: 'UDP Header (8 Bytes Fixed)', value: 'udp' }
      ],
      value: mode,
      onChange: (v) => { mode = v; render(); }
    });

    const cv = OS.canvas(host, {
      height: 170,
      label: 'TCP and UDP header bit layout',
      draw: (ctx, w, h) => {
        if (mode === 'udp') {
          // UDP 8-byte layout (4 fields of 16-bit)
          const fieldW = (w - 50) / 2;
          const fields = [
            { name: 'Source Port (16b)', val: '54122' },
            { name: 'Destination Port (16b)', val: '53 (DNS)' },
            { name: 'Length (16b)', val: '48 Bytes' },
            { name: 'Checksum (16b)', val: '0x1F2A' }
          ];

          fields.forEach((f, idx) => {
            const row = Math.floor(idx / 2);
            const col = idx % 2;
            const x = 25 + col * fieldW;
            const y = 30 + row * 50;

            ctx.fillStyle = OS.rgba(OS.C.teal, 0.15);
            ctx.strokeStyle = OS.C.teal;
            ctx.lineWidth = 1;
            ctx.roundRect(x, y, fieldW - 6, 42, 6);
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = OS.C.teal;
            ctx.font = OS.font(10, 'mono', 600);
            ctx.fillText(f.name, x + 10, y + 18);
            ctx.fillStyle = OS.C.ink;
            ctx.font = OS.font(11, 'mono', 500);
            ctx.fillText(f.val, x + 10, y + 34);
          });
        } else {
          // TCP 20-byte layout
          ctx.fillStyle = OS.rgba(OS.C.accent, 0.15);
          ctx.strokeStyle = OS.C.accent;
          ctx.lineWidth = 1;
          ctx.roundRect(25, 25, w - 50, 115, 6);
          ctx.fill(); ctx.stroke();

          ctx.fillStyle = OS.C.accent;
          ctx.font = OS.font(11, 'mono', 600);
          ctx.fillText('TCP SEGMENT HEADER (20 Bytes Minimum)', 35, 45);

          ctx.fillStyle = OS.C.ink;
          ctx.font = OS.font(10, 'mono', 400);
          ctx.fillText('• Bytes 0-3: Source Port (16b) | Destination Port (16b)', 35, 68);
          ctx.fillText('• Bytes 4-7: Sequence Number (32b)', 35, 86);
          ctx.fillText('• Bytes 8-11: Acknowledgment Number (32b)', 35, 104);
          ctx.fillText('• Bytes 12-19: Data Offset, Flags [SYN,ACK,FIN,RST], Window Size, Checksum', 35, 122);
        }
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      if (mode === 'udp') {
        readout.innerHTML = `
          <b>UDP Simplicity:</b> Only <b>8 bytes overhead</b>. No connection state, no acknowledgments, no flow control. Ideal for DNS, real-time gaming, and QUIC.
        `;
      } else {
        readout.innerHTML = `
          <b>TCP Complexity:</b> Minimum <b>20 bytes overhead</b> (up to 60 with options). Implements sequence tracking, acknowledgments, dynamic sliding windows, and congestion flags.
        `;
      }
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 7. Sliding Window Protocol: Go-Back-N (GBN) vs Selective Repeat (SR)
   * -------------------------------------------------------------------------- */
  OS.register('slidingWindow', function (host) {
    let mode = 'gbn'; // 'gbn' or 'sr'
    let windowSize = 4;
    let base = 0;
    let droppedPacket = 2; // Packet 2 gets dropped

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Retransmission Policy',
      options: [
        { label: 'Go-Back-N (GBN)', value: 'gbn' },
        { label: 'Selective Repeat (SR)', value: 'sr' }
      ],
      value: mode,
      onChange: (v) => { mode = v; base = 0; render(); }
    });

    OS.button(controls, 'Send Next Packet ▶', () => {
      base = (base + 1) % 8;
      render();
    }, { primary: true });

    OS.button(controls, 'Reset Window', () => {
      base = 0; render();
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'Sliding window protocol states',
      draw: (ctx, w, h) => {
        const totalPackets = 10;
        const boxW = Math.min(65, (w - 60) / totalPackets);

        for (let i = 0; i < totalPackets; i++) {
          const bx = 25 + i * boxW;
          const inWindow = (i >= base && i < base + windowSize);
          const isDropped = (i === droppedPacket);

          ctx.fillStyle = isDropped && inWindow ? OS.rgba(OS.C.rose, 0.25) : (inWindow ? OS.rgba(OS.C.accent, 0.2) : OS.C.sunk);
          ctx.strokeStyle = isDropped && inWindow ? OS.C.rose : (inWindow ? OS.C.accent : OS.C.line);
          ctx.lineWidth = inWindow ? 2 : 1;
          ctx.roundRect(bx, 40, boxW - 5, 55, 6);
          ctx.fill(); ctx.stroke();

          ctx.fillStyle = OS.C.ink;
          ctx.font = OS.font(10, 'mono', 600);
          ctx.fillText(`Pkt ${i}`, bx + 6, 62);

          ctx.fillStyle = isDropped && inWindow ? OS.C.rose : (inWindow ? OS.C.accent : OS.C.muted);
          ctx.font = OS.font(8, 'mono', 500);
          ctx.fillText(isDropped && inWindow ? 'LOST' : (inWindow ? 'IN WND' : (i < base ? 'ACKED' : 'WAIT')), bx + 6, 82);
        }

        // Draw Sliding Window Bracket
        const winX = 25 + base * boxW;
        const winW = windowSize * boxW - 5;
        ctx.strokeStyle = OS.C.amber;
        ctx.lineWidth = 2;
        ctx.strokeRect(winX - 3, 30, winW + 6, 75);

        ctx.fillStyle = OS.C.amber;
        ctx.font = OS.font(10, 'mono', 600);
        ctx.fillText(`SLIDING WINDOW (N = ${windowSize})`, winX, 125);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      if (mode === 'gbn') {
        readout.innerHTML = `
          <b>Go-Back-N (GBN) Policy:</b> When Packet 2 is lost, receiver discards all subsequent packets (3, 4, 5). Sender timer expires and <b>retransmits ALL N unacked packets</b> starting from 2.
        `;
      } else {
        readout.innerHTML = `
          <b>Selective Repeat (SR) Policy:</b> Receiver buffers out-of-order packets (3, 4, 5) and ACKs them individually. Sender only retransmits the single missing Packet 2, saving network bandwidth.
        `;
      }
    }
    render();
  });

})();
