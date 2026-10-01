/* ==========================================================================
   Computer Networks, Packet by Packet — Link Layer & Systems (viz-link-systems.js)
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * 21. Address Resolution Protocol (ARP) Stepper
   * -------------------------------------------------------------------------- */
  OS.register('arpStepper', function (host) {
    const steps = [
      { step: 1, action: 'Host A consults local ARP Cache', state: 'MISS', desc: 'Host A needs MAC address for IP 192.168.1.5. Cache contains no entry.' },
      { step: 2, action: 'Host A broadcasts ARP Request', state: 'BROADCAST', desc: 'Frame sent to FF:FF:FF:FF:FF:FF: "Who has 192.168.1.5? Tell 192.168.1.2".' },
      { step: 3, action: 'Ethernet Switch floods frame to all ports', state: 'FLOOD', desc: 'All hosts on the LAN receive the broadcast frame and inspect target IP.' },
      { step: 4, action: 'Host B unicasts ARP Reply', state: 'UNICAST', desc: 'Host B recognizes its IP: "192.168.1.5 is at 52:54:00:12:34:56". Sent directly to Host A.' },
      { step: 5, action: 'Host A updates ARP Cache Table', state: 'CACHED', desc: 'Host A records (192.168.1.5 ➔ 52:54:00:12:34:56, TTL 1200s). Can now frame IP packet!' }
    ];

    let currentStep = 0;

    const controls = OS.controls(host);
    OS.button(controls, 'Next ARP Step ▶', () => {
      currentStep = (currentStep + 1) % steps.length;
      render();
    }, { primary: true });

    OS.button(controls, 'Reset ARP Flow', () => {
      currentStep = 0; render();
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'Address resolution protocol discovery flow',
      draw: (ctx, w, h) => {
        const s = steps[currentStep];
        const boxW = Math.min(180, (w - 70) / 3);

        // Host A
        ctx.fillStyle = s.state === 'CACHED' ? OS.rgba(OS.C.teal, 0.15) : OS.C.sunk;
        ctx.strokeStyle = s.state === 'CACHED' ? OS.C.teal : OS.C.line;
        ctx.lineWidth = 1.5;
        ctx.roundRect(25, 25, boxW, 70, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = OS.C.user;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('HOST A', 35, 45);
        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(9, 'mono', 400);
        ctx.fillText('IP: 192.168.1.2', 35, 65);
        ctx.fillText('MAC: 00:1A:2B:3C:4D:5E', 35, 80);

        // Switch
        const swX = 25 + boxW + 10;
        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.roundRect(swX, 25, boxW, 70, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = OS.C.amber;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('LAN SWITCH', swX + 10, 45);
        ctx.font = OS.font(9, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('Transparent Bridging', swX + 10, 65);
        ctx.fillText('Floods Broadcasts', swX + 10, 80);

        // Host B
        const bX = swX + boxW + 10;
        ctx.fillStyle = OS.rgba(OS.C.teal, 0.15);
        ctx.strokeStyle = OS.C.teal;
        ctx.roundRect(bX, 25, boxW, 70, 6);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = OS.C.teal;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('HOST B (Target)', bX + 10, 45);
        ctx.font = OS.font(9, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText('IP: 192.168.1.5', bX + 10, 65);
        ctx.fillText('MAC: 52:54:00:12:34:56', bX + 10, 80);

        // Progress action row below
        const actY = 110;
        ctx.fillStyle = OS.rgba(OS.C.accent, 0.1);
        ctx.strokeStyle = OS.C.accent;
        ctx.roundRect(25, actY, w - 50, 50, 6);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(10, 'mono', 600);
        ctx.fillText(`Step ${s.step}/5: ${s.action}`, 35, actY + 22);
        ctx.fillStyle = OS.C.muted;
        ctx.font = OS.font(9, 'sans', 400);
        ctx.fillText(s.desc, 35, actY + 40);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      const s = steps[currentStep];
      readout.innerHTML = `
        <b>Address Resolution Protocol:</b> IP addresses are virtual abstractions; network cards (NICs) can only transmit to physical 48-bit MAC addresses.<br>
        ARP glues Layer 3 to Layer 2 by dynamically mapping IP addresses to hardware MACs on the local link.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 22. Spanning Tree Protocol (STP 802.1D) Loop Elimination
   * -------------------------------------------------------------------------- */
  OS.register('spanningTree', function (host) {
    let stpActive = true;

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Bridge Protocol State',
      options: [
        { label: '802.1D STP Active (Loop Blocked)', value: 'active' },
        { label: 'STP Disabled (Broadcast Storm!)', value: 'disabled' }
      ],
      value: stpActive ? 'active' : 'disabled',
      onChange: (v) => { stpActive = (v === 'active'); render(); }
    });

    const cv = OS.canvas(host, {
      height: 190,
      label: 'Spanning tree protocol redundant loop elimination',
      draw: (ctx, w, h) => {
        const cx = 100;
        const cy = 90;

        // Switch A (Root Bridge)
        const sA = { x: cx, y: 35, name: 'Switch A (Root Bridge: Priority 4096)' };
        // Switch B
        const sB = { x: cx - 60, y: 135, name: 'Switch B' };
        // Switch C
        const sC = { x: cx + 60, y: 135, name: 'Switch C' };

        // Triangle Links
        ctx.strokeStyle = OS.C.teal;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sA.x, sA.y); ctx.lineTo(sB.x, sB.y);
        ctx.moveTo(sA.x, sA.y); ctx.lineTo(sC.x, sC.y);
        ctx.stroke();

        // Redundant Link between B and C
        ctx.strokeStyle = stpActive ? OS.C.rose : OS.C.amber;
        ctx.lineWidth = stpActive ? 2 : 3;
        ctx.setLineDash(stpActive ? [6, 4] : []);
        ctx.beginPath();
        ctx.moveTo(sB.x, sB.y); ctx.lineTo(sC.x, sC.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Switch Nodes
        [sA, sB, sC].forEach((s, idx) => {
          ctx.fillStyle = idx === 0 ? OS.C.accent : OS.C.sunk;
          ctx.strokeStyle = idx === 0 ? OS.C.accent : OS.C.line;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 14, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();

          ctx.fillStyle = idx === 0 ? '#ffffff' : OS.C.ink;
          ctx.font = OS.font(9, 'mono', 600);
          ctx.fillText(`S${idx + 1}`, s.x - 5, s.y + 3);
        });

        // STP Blocking Marker
        if (stpActive) {
          ctx.fillStyle = OS.C.rose;
          ctx.font = OS.font(9, 'mono', 600);
          ctx.fillText('✕ BLOCKING PORT', cx - 40, 150);
        }

        // Explanation Box on Right
        const rX = 220;
        ctx.fillStyle = stpActive ? OS.rgba(OS.C.teal, 0.08) : OS.rgba(OS.C.rose, 0.15);
        ctx.strokeStyle = stpActive ? OS.C.teal : OS.C.rose;
        ctx.lineWidth = 1.5;
        ctx.roundRect(rX, 25, w - rX - 25, 140, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = stpActive ? OS.C.teal : OS.C.rose;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(stpActive ? '802.1D STP LOOP-FREE TOPOLOGY' : 'BROADCAST STORM IN PROGRESS!', rX + 12, 48);

        ctx.font = OS.font(9, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        if (stpActive) {
          ctx.fillText('• Switch 1 elected Root Bridge (Lowest BID)', rX + 12, 75);
          ctx.fillText('• Redundant port on Switch 3 placed in BLOCKING', rX + 12, 98);
          ctx.fillText('• Graph converted from cycle to spanning tree', rX + 12, 120);
        } else {
          ctx.fillText('• Broadcast ARP packets cycle infinitely', rX + 12, 75);
          ctx.fillText('• MAC tables thrash on every cycle', rX + 12, 98);
          ctx.fillText('• 100% link bandwidth and CPU consumed in seconds!', rX + 12, 120);
        }
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>Broadcast Storm Risk:</b> Ethernet frames have no TTL hop limit field! A single broadcast packet inside a physical loop circulates forever, duplicating endlessly until the switch fabric crashes. Spanning Tree breaks physical cycles logically into a loop-free tree.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 23. Wi-Fi CSMA/CA Hidden Terminal & RTS/CTS Handshake
   * -------------------------------------------------------------------------- */
  OS.register('csmaCa', function (host) {
    let rtsCtsEnabled = false;

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Collision Avoidance Protocol',
      options: [
        { label: 'Basic CSMA/CA (Hidden Node Collision)', value: 'basic' },
        { label: 'With RTS/CTS Handshake (Protected)', value: 'rts' }
      ],
      value: rtsCtsEnabled ? 'rts' : 'basic',
      onChange: (v) => { rtsCtsEnabled = (v === 'rts'); render(); }
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'WiFi hidden terminal problem and RTS CTS handshake',
      draw: (ctx, w, h) => {
        const cy = 60;
        const nA = { x: 50, y: cy, name: 'Node A' };
        const nAP = { x: w / 2, y: cy, name: 'Access Point (AP)' };
        const nB = { x: w - 50, y: cy, name: 'Node C' };

        // Radii rings
        ctx.strokeStyle = OS.rgba(OS.C.accent, 0.2);
        ctx.beginPath();
        ctx.arc(nA.x, nA.y, 90, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = OS.rgba(OS.C.teal, 0.2);
        ctx.beginPath();
        ctx.arc(nB.x, nB.y, 90, 0, Math.PI * 2);
        ctx.stroke();

        // Draw nodes
        [nA, nAP, nB].forEach((n, idx) => {
          ctx.fillStyle = idx === 1 ? OS.C.amber : OS.C.accent;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 16, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = OS.C.ink;
          ctx.font = OS.font(10, 'mono', 600);
          ctx.fillText(n.name, n.x - 20, n.y + 32);
        });

        // Bottom Banner
        const banY = 115;
        ctx.fillStyle = rtsCtsEnabled ? OS.rgba(OS.C.green, 0.12) : OS.rgba(OS.C.rose, 0.12);
        ctx.strokeStyle = rtsCtsEnabled ? OS.C.green : OS.C.rose;
        ctx.lineWidth = 1.5;
        ctx.roundRect(25, banY, w - 50, 48, 6);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = rtsCtsEnabled ? OS.C.green : OS.C.rose;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(rtsCtsEnabled ?
          '✓ RTS/CTS ACTIVE: AP broadcasts CTS (Clear-to-Send) with NAV duration -> Node C senses CTS and waits!' :
          '❌ COLLISION: Node A and Node C cannot hear each other! Both transmit to AP simultaneously -> Packets collide!',
          35, banY + 28);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>The Hidden Terminal Problem:</b> Node A and Node C are out of radio range of each other, but both can communicate with Access Point B.<br>
        Standard CSMA/CD fails on wireless because radio transceivers cannot transmit and listen simultaneously. RTS/CTS reserves channel time via the Network Allocation Vector (NAV).
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 24. Cyclic Redundancy Check (CRC-32) Polynomial Division
   * -------------------------------------------------------------------------- */
  OS.register('crcDivision', function (host) {
    const dataWord = '11010011101100'; // Binary stream
    const generator = '1011'; // Generator polynomial (x^3 + x + 1)

    const controls = OS.controls(host);
    let step = 0;

    OS.button(controls, 'Step XOR Division ▶', () => {
      step = (step + 1) % 6;
      render();
    }, { primary: true });

    OS.button(controls, 'Reset CRC', () => {
      step = 0; render();
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'Cyclic redundancy check polynomial division',
      draw: (ctx, w, h) => {
        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.roundRect(25, 20, w - 50, 140, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText('CRC MODULO-2 (XOR) LONG DIVISION PIPELINE', 35, 42);

        ctx.font = OS.font(11, 'mono', 500);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`• Data Bitstream D:  ${dataWord} (Appended with 3 zero bits)`, 35, 68);
        ctx.fillText(`• Generator Poly G:  ${generator} (Degree r = 3)`, 35, 90);

        ctx.fillStyle = OS.C.teal;
        ctx.fillText(`• Modulo-2 Remainder R (FCS Checksum): [010] (Computed in hardware shift registers)`, 35, 114);

        ctx.fillStyle = OS.C.muted;
        ctx.font = OS.font(9, 'sans', 400);
        ctx.fillText('CRC detects all single-bit errors, double-bit errors, and odd-numbered bit errors with zero division instructions.', 35, 140);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>CRC Mathematics:</b> The sender appends $r$ checksum bits such that $(D \\cdot 2^r) \\oplus R$ is exactly divisible by $G$. The receiver divides the received frame by $G$; a non-zero remainder proves transmission bit corruption.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 25. eBPF XDP Line-Rate Packet Processing
   * -------------------------------------------------------------------------- */
  OS.register('ebpfXdp', function (host) {
    let xdpMode = 'xdp'; // 'kernel' or 'xdp'

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Packet Processing Path',
      options: [
        { label: 'eBPF XDP (Line Rate: 24 Mpps)', value: 'xdp' },
        { label: 'Standard Linux Stack (sk_buff: 2 Mpps)', value: 'kernel' }
      ],
      value: xdpMode,
      onChange: (v) => { xdpMode = v; render(); }
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'eBPF XDP vs Linux network stack latency',
      draw: (ctx, w, h) => {
        const isXdp = (xdpMode === 'xdp');

        ctx.fillStyle = isXdp ? OS.rgba(OS.C.green, 0.12) : OS.rgba(OS.C.amber, 0.12);
        ctx.strokeStyle = isXdp ? OS.C.green : OS.C.amber;
        ctx.lineWidth = 2;
        ctx.roundRect(25, 25, w - 50, 120, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = isXdp ? OS.C.green : OS.C.amber;
        ctx.font = OS.font(12, 'mono', 600);
        ctx.fillText(isXdp ? 'eBPF XDP DRIVER HOOK (XDP_DROP / XDP_TX)' : 'STANDARD LINUX KERNEL STACK (alloc_skb)', 35, 52);

        ctx.font = OS.font(10, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        if (isXdp) {
          ctx.fillText('• Executes inside NIC driver ring buffer before memory allocation', 35, 78);
          ctx.fillText('• Throughput: ~24,000,000 packets/sec (Line-Rate 100 GbE DDOS mitigation)', 35, 100);
          ctx.fillText('• CPU cycles per packet: ~25 cycles (Zero memory allocations)', 35, 122);
        } else {
          ctx.fillText('• Allocates 240-byte sk_buff metadata struct in kernel slab cache', 35, 78);
          ctx.fillText('• Traverses iptables / netfilter / routing table / TCP socket backlog', 35, 100);
          ctx.fillText('• Throughput ceiling: ~2,000,000 packets/sec (CPU bound on memory alloc)', 35, 122);
        }
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>XDP (eXpress Data Path):</b> By executing verified eBPF bytecode directly inside the network driver before allocating heavy <code>sk_buff</code> kernel descriptors, Linux can drop malicious DDoS floods at wire speed (hundreds of gigabits/sec).
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 26. OpenFlow SDN Match-Action Multi-Table Pipeline
   * -------------------------------------------------------------------------- */
  OS.register('openflowSdn', function (host) {
    const rules = [
      { table: 'Table 0 (Ingress Classifier)', match: 'In_Port: 1, EtherType: 0x0800', action: 'Goto Table 1' },
      { table: 'Table 1 (Access Control / ACL)', match: 'Dst_IP: 10.0.0.4/32, TCP_Port: 22', action: 'DROP (Blocked by Firewall)' },
      { table: 'Table 2 (Forwarding Engine)', match: 'Dst_IP: 10.0.0.0/24', action: 'Set_VLAN: 100, Output: Port 4' }
    ];

    const controls = OS.controls(host);
    let activeRule = 0;

    OS.button(controls, 'Step Packet through Tables ▶', () => {
      activeRule = (activeRule + 1) % rules.length;
      render();
    }, { primary: true });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'OpenFlow SDN match action pipeline',
      draw: (ctx, w, h) => {
        const rowH = 34;
        rules.forEach((r, idx) => {
          const y = 25 + idx * (rowH + 10);
          const isActive = (idx === activeRule);

          ctx.fillStyle = isActive ? OS.rgba(OS.C.accent, 0.2) : OS.C.sunk;
          ctx.strokeStyle = isActive ? OS.C.accent : OS.C.line;
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.roundRect(25, y, w - 50, rowH, 6);
          ctx.fill(); ctx.stroke();

          ctx.fillStyle = isActive ? OS.C.accent : OS.C.ink;
          ctx.font = OS.font(10, 'mono', 600);
          ctx.fillText(r.table, 35, y + 21);

          ctx.font = OS.font(9, 'mono', 400);
          ctx.fillStyle = OS.C.muted;
          ctx.fillText(`Match: [${r.match}] ➔ Action: [${r.action}]`, w * 0.45, y + 21);
        });
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>Software-Defined Networking (SDN):</b> Decouples the control plane (running on a centralized controller like OpenDaylight or ONOS) from the data plane. Switches become general-purpose match-action engines executing OpenFlow pipelines.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 27. Global Network Latency Numbers & Speed of Light
   * -------------------------------------------------------------------------- */
  OS.register('fiberLatency', function (host) {
    const routes = [
      { from: 'San Francisco', to: 'New York', distKm: 4140, rttVacuum: '27.6 ms', rttFiber: '41.4 ms', rttReal: '~70 ms' },
      { from: 'New York', to: 'London (Transatlantic)', distKm: 5570, rttVacuum: '37.1 ms', rttFiber: '55.7 ms', rttReal: '~78 ms' },
      { from: 'San Francisco', to: 'Tokyo (Transpacific)', distKm: 8280, rttVacuum: '55.2 ms', rttFiber: '82.8 ms', rttReal: '~115 ms' },
      { from: 'Server Rack A', to: 'Server Rack B (Datacenter)', distKm: 0.1, rttVacuum: '0.0006 ms', rttFiber: '0.001 ms', rttReal: '0.25 ms' }
    ];

    let selectedRoute = routes[0];

    const controls = OS.controls(host);
    OS.select(controls, {
      id: 'route-select',
      label: 'Select Geographic Link:',
      options: routes.map((r, i) => ({ label: `${r.from} ➔ ${r.to}`, value: i })),
      value: 0,
      onChange: (v) => {
        selectedRoute = routes[parseInt(v)] || routes[0];
        render();
      }
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'Speed of light in fiber optic latency numbers',
      draw: (ctx, w, h) => {
        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.roundRect(25, 20, w - 50, 140, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(12, 'mono', 600);
        ctx.fillText(`FIBER OPTIC LATENCY: ${selectedRoute.from} ➔ ${selectedRoute.to}`, 35, 45);

        ctx.font = OS.font(10, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`• Physical Distance: ${selectedRoute.distKm.toLocaleString()} km`, 35, 72);
        ctx.fillText(`• Speed of Light in Glass Fiber (c / 1.5 ≈ 200 km/ms): Min RTT = ${selectedRoute.rttFiber}`, 35, 95);
        ctx.fillStyle = OS.C.teal;
        ctx.fillText(`• Real-World Internet RTT (Queuing, peering, routing hops): ${selectedRoute.rttReal}`, 35, 118);

        ctx.font = OS.font(9, 'sans', 400);
        ctx.fillStyle = OS.C.muted;
        ctx.fillText('No amount of software optimization can exceed the speed of light in silica glass (5 µs per kilometer).', 35, 142);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      readout.innerHTML = `
        <b>Physics of Networking:</b> Light in optical fiber travels at <b>~200,000 km/s</b> (refractive index $n \\approx 1.5$). A packet from San Francisco to London physically requires over $40\\,\\text{ms}$ simply traversing the glass, making latency the ultimate bound on distributed systems.
      `;
    }
    render();
  });

})();
