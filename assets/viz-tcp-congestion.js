/* ==========================================================================
   Computer Networks, Packet by Packet — TCP & Congestion Control (viz-tcp-congestion.js)
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------------
   * Hero Visualizer: Interactive TCP Congestion Control Arena (Reno vs Cubic vs BBR)
   * -------------------------------------------------------------------------- */
  OS.register('tcpHero', function (host) {
    let policy = 'CUBIC'; // 'RENO', 'CUBIC', 'BBR'
    let lossRate = 2; // % loss
    let rtt = 40; // ms
    let timeStep = 0;

    let cwnd = 10; // Congestion window (packets)
    let ssthresh = 32;
    let history = [];

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Algorithm',
      options: [
        { label: 'TCP CUBIC (Linux Default)', value: 'CUBIC' },
        { label: 'TCP Reno (Classic AIMD)', value: 'RENO' },
        { label: 'Google BBR (Model-based)', value: 'BBR' }
      ],
      value: policy,
      onChange: (v) => { policy = v; reset(); }
    });

    OS.slider(controls, {
      id: 'loss-rate-slider',
      label: 'Random Packet Loss:',
      min: 0,
      max: 10,
      step: 1,
      value: lossRate,
      format: (v) => `${v}%`,
      onInput: (v) => { lossRate = v; render(); }
    });

    OS.button(controls, 'Run 10 RTT Steps ▶', () => {
      for (let i = 0; i < 10; i++) stepSimulation();
      render();
    }, { primary: true });

    OS.button(controls, 'Inject Packet Loss Event', () => {
      triggerLoss();
      render();
    });

    OS.button(controls, 'Reset Simulation', reset);

    function reset() {
      timeStep = 0;
      cwnd = 10;
      ssthresh = 32;
      history = [{ t: 0, cwnd: 10, loss: false }];
      for (let i = 0; i < 20; i++) stepSimulation();
      render();
    }

    function triggerLoss() {
      if (policy === 'RENO') {
        ssthresh = Math.max(2, Math.floor(cwnd / 2));
        cwnd = ssthresh; // Multiplicative decrease
      } else if (policy === 'CUBIC') {
        ssthresh = Math.max(2, Math.floor(cwnd * 0.7));
        cwnd = ssthresh; // 30% reduction instead of 50%
      } else if (policy === 'BBR') {
        // BBR does not reduce cwnd on packet loss unless link is genuinely saturated!
        cwnd = Math.max(8, cwnd * 0.95);
      }
      history.push({ t: ++timeStep, cwnd, loss: true });
    }

    function stepSimulation() {
      timeStep++;
      const hasLoss = (Math.random() * 100 < lossRate);

      if (hasLoss) {
        triggerLoss();
        return;
      }

      if (policy === 'RENO') {
        if (cwnd < ssthresh) {
          cwnd = Math.min(64, cwnd * 2); // Slow start exponential
        } else {
          cwnd = Math.min(64, cwnd + 1); // Linear additive increase
        }
      } else if (policy === 'CUBIC') {
        if (cwnd < ssthresh) {
          cwnd = Math.min(64, cwnd * 2);
        } else {
          // Cubic polynomial: W(t) = C(t - K)^3 + W_max
          const growth = Math.max(1, Math.floor(Math.pow((timeStep % 15) - 7, 2) * 0.15) + 1);
          cwnd = Math.min(64, cwnd + growth);
        }
      } else if (policy === 'BBR') {
        // BBR operates at the Kleinrock optimal point (Max Bandwidth, Min RTT)
        cwnd = 35 + Math.sin(timeStep * 0.4) * 4;
      }

      history.push({ t: timeStep, cwnd: Math.round(cwnd), loss: false });
      if (history.length > 50) history.shift();
    }

    const cv = OS.canvas(host, {
      height: 220,
      label: 'TCP congestion window timeline graph',
      draw: (ctx, w, h) => {
        const plotX = 45;
        const plotY = 20;
        const plotW = w - 65;
        const plotH = h - 55;

        // Background & Grid
        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.lineWidth = 1;
        ctx.roundRect(plotX, plotY, plotW, plotH, 6);
        ctx.fill(); ctx.stroke();

        // Axes ticks
        ctx.fillStyle = OS.C.muted;
        ctx.font = OS.font(9, 'mono', 500);
        ctx.fillText('64 pkts', 5, plotY + 12);
        ctx.fillText('32 pkts', 5, plotY + plotH / 2 + 4);
        ctx.fillText('0 pkts', 10, plotY + plotH);

        // Draw CWND curve
        if (history.length > 1) {
          const stepW = plotW / Math.max(1, history.length - 1);
          ctx.beginPath();
          ctx.strokeStyle = (policy === 'BBR' ? OS.C.teal : (policy === 'CUBIC' ? OS.C.accent : OS.C.amber));
          ctx.lineWidth = 2.5;

          history.forEach((pt, i) => {
            const x = plotX + i * stepW;
            const y = plotY + plotH - (pt.cwnd / 64) * plotH;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          });
          ctx.stroke();

          // Draw Loss Drops (Red dots)
          history.forEach((pt, i) => {
            if (pt.loss) {
              const x = plotX + i * stepW;
              const y = plotY + plotH - (pt.cwnd / 64) * plotH;
              ctx.fillStyle = OS.C.rose;
              ctx.beginPath();
              ctx.arc(x, y, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }

        // Current status label
        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(`Current cwnd: ${Math.round(cwnd)} pkts · ssthresh: ${ssthresh} · Policy: ${policy} · Loss: ${lossRate}%`, plotX + 15, plotY + 22);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      const throughputMbps = Math.round((cwnd * 1500 * 8) / (rtt * 1000) * 100) / 100;
      if (policy === 'BBR') {
        readout.innerHTML = `
          <b>Google BBR:</b> <span class="hl">Model-Based Congestion Control</span> | Throughput: <b>~${throughputMbps} Mbps</b>.<br>
          BBR measures actual <code>BtlBw</code> (bottleneck bandwidth) and <code>RTprop</code> (round-trip propagation delay). It paces packets smoothly, ignoring random buffer drops that cripple Reno and Cubic.
        `;
      } else if (policy === 'CUBIC') {
        readout.innerHTML = `
          <b>TCP CUBIC:</b> <span class="hl">Linux Default Congestion Control</span> | Throughput: <b>~${throughputMbps} Mbps</b>.<br>
          Cubic uses a cubic polynomial curve to scale window growth based on physical elapsed time rather than RTT, enabling rapid recovery and high throughput across high-bandwidth long-distance (LFN) links.
        `;
      } else {
        readout.innerHTML = `
          <b>TCP Reno:</b> <span class="hl">Classic AIMD (Additive Increase, Multiplicative Decrease)</span> | Throughput: <b>~${throughputMbps} Mbps</b>.<br>
          Increases <code>cwnd</code> by 1 packet per RTT during congestion avoidance. When loss occurs, it halves <code>cwnd = cwnd / 2</code>, producing the characteristic saw-tooth waveform.
        `;
      }
    }

    reset();
  });

  /* --------------------------------------------------------------------------
   * 8. TCP Connection Lifecycle FSM Stepper (3-Way Handshake & Teardown)
   * -------------------------------------------------------------------------- */
  OS.register('tcpFsm', function (host) {
    const states = [
      { step: 1, action: 'Client sends SYN (Seq=1000)', cState: 'SYN_SENT', sState: 'LISTEN', desc: 'Client initiates connection with random Initial Sequence Number (ISN).' },
      { step: 2, action: 'Server replies SYN-ACK (Seq=5000, Ack=1001)', cState: 'SYN_SENT', sState: 'SYN_RCVD', desc: 'Server allocates TCB buffer, sends its own ISN, acknowledges client ISN+1.' },
      { step: 3, action: 'Client sends ACK (Ack=5001)', cState: 'ESTABLISHED', sState: 'ESTABLISHED', desc: 'Connection fully established! Bidirectional full-duplex byte streaming active.' },
      { step: 4, action: 'Client initiates close: sends FIN', cState: 'FIN_WAIT_1', sState: 'CLOSE_WAIT', desc: 'Client closes its write half of the connection.' },
      { step: 5, action: 'Server ACKs FIN and sends its own FIN', cState: 'TIME_WAIT', sState: 'LAST_ACK', desc: 'Server confirms closure; client enters TIME_WAIT state.' },
      { step: 6, action: 'Client sends final ACK; Timer expires', cState: 'CLOSED', sState: 'CLOSED', desc: 'Client waits 2*MSL (Maximum Segment Lifetime, ~60s) before freeing socket port.' }
    ];

    let currentStep = 0;

    const controls = OS.controls(host);
    OS.button(controls, 'Next TCP State ▶', () => {
      currentStep = (currentStep + 1) % states.length;
      render();
    }, { primary: true });

    OS.button(controls, 'Reset Connection Flow', () => {
      currentStep = 0; render();
    });

    const cv = OS.canvas(host, {
      height: 190,
      label: 'TCP state machine transitions',
      draw: (ctx, w, h) => {
        const s = states[currentStep];
        const boxW = Math.min(220, (w - 70) / 2);

        // Client State Box
        ctx.fillStyle = s.cState === 'ESTABLISHED' ? OS.rgba(OS.C.teal, 0.15) : OS.C.sunk;
        ctx.strokeStyle = s.cState === 'ESTABLISHED' ? OS.C.teal : OS.C.line;
        ctx.lineWidth = 1.5;
        ctx.roundRect(25, 20, boxW, 80, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.user;
        ctx.font = OS.font(12, 'mono', 600);
        ctx.fillText('TCP CLIENT HOST', 35, 42);
        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 500);
        ctx.fillText(`State: [${s.cState}]`, 35, 68);

        // Server State Box
        const sX = w - 25 - boxW;
        ctx.fillStyle = s.sState === 'ESTABLISHED' ? OS.rgba(OS.C.teal, 0.15) : OS.C.sunk;
        ctx.strokeStyle = s.sState === 'ESTABLISHED' ? OS.C.teal : OS.C.line;
        ctx.lineWidth = 1.5;
        ctx.roundRect(sX, 20, boxW, 80, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.teal;
        ctx.font = OS.font(12, 'mono', 600);
        ctx.fillText('TCP SERVER HOST', sX + 15, 42);
        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 500);
        ctx.fillText(`State: [${s.sState}]`, sX + 15, 68);

        // Transaction Banner
        const banY = 118;
        ctx.fillStyle = OS.rgba(OS.C.accent, 0.1);
        ctx.strokeStyle = OS.C.accent;
        ctx.lineWidth = 1;
        ctx.roundRect(25, banY, w - 50, 52, 6);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = OS.C.accent;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(`Packet Flow: ${s.action}`, 35, banY + 22);
        ctx.fillStyle = OS.C.muted;
        ctx.font = OS.font(10, 'sans', 400);
        ctx.fillText(s.desc, 35, banY + 40);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      const s = states[currentStep];
      readout.innerHTML = `
        <b>Step ${s.step}/6:</b> <span class="hl">${s.action}</span><br>
        <span style="font-size:0.75rem; color:var(--muted)">Why TIME_WAIT exists: Prevents delayed duplicate segments from an old connection from corrupting a newly established socket with identical 4-tuple IP/ports.</span>
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 9. TCP Flow Control: Receive Window rwnd & Buffer Exhaustion
   * -------------------------------------------------------------------------- */
  OS.register('flowControl', function (host) {
    const BUFFER_CAP = 64; // KB
    let bufferedBytes = 16; // KB currently stored in receiver buffer

    const controls = OS.controls(host);
    OS.button(controls, 'Sender Transmits 16 KB', () => {
      bufferedBytes = Math.min(BUFFER_CAP, bufferedBytes + 16);
      render();
    }, { primary: true });

    OS.button(controls, 'Application Reads 16 KB', () => {
      bufferedBytes = Math.max(0, bufferedBytes - 16);
      render();
    });

    OS.button(controls, 'Reset Flow Control', () => {
      bufferedBytes = 16; render();
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'TCP flow control receive window buffer',
      draw: (ctx, w, h) => {
        const rwnd = BUFFER_CAP - bufferedBytes;
        const barY = 40;
        const barW = w - 50;

        // Buffer Container
        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.lineWidth = 1;
        ctx.roundRect(25, barY, barW, 60, 6);
        ctx.fill(); ctx.stroke();

        // Occupied Bytes
        const filledW = (barW * bufferedBytes) / BUFFER_CAP;
        ctx.fillStyle = rwnd === 0 ? OS.rgba(OS.C.rose, 0.4) : OS.rgba(OS.C.accent, 0.35);
        ctx.fillRect(25, barY, filledW, 60);

        // Labels
        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(`Occupied Buffer: ${bufferedBytes} KB`, 35, barY + 34);

        ctx.fillStyle = rwnd === 0 ? OS.C.rose : OS.C.green;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(`Advertised rwnd = ${rwnd} KB`, w - 210, barY + 34);

        // Window status explanation
        const statY = 125;
        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 500);
        ctx.fillText(rwnd === 0 ?
          '⚠️ RECEIVE BUFFER FULL: Advertises rwnd = 0. Sender is paused! (Sends 1-byte Zero-Window Probes)' :
          '✓ Healthy Flow: Sender may transmit up to advertised rwnd bytes without acknowledgment.',
          25, statY);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      const rwnd = BUFFER_CAP - bufferedBytes;
      readout.innerHTML = `
        <b>Flow Control Invariant:</b> <code>LastByteSent − LastByteAcked ≤ rwnd</code>.<br>
        Flow control prevents a fast sender from overflowing a slow receiver's socket buffer. When <code>rwnd = 0</code>, the sender halts until the application drains the buffer.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 10. Jacobson's RTT Estimator & Retransmission Timeout (RTO)
   * -------------------------------------------------------------------------- */
  OS.register('rttEstimator', function (host) {
    let srtt = 40.0; // Smoothed RTT (ms)
    let rttvar = 10.0; // RTT Variation (ms)
    let sampleRtt = 42.0;

    const controls = OS.controls(host);
    OS.button(controls, 'Normal Sample (45 ms)', () => {
      updateRtt(45.0); render();
    }, { primary: true });

    OS.button(controls, 'Latency Spike Sample (120 ms)', () => {
      updateRtt(120.0); render();
    });

    OS.button(controls, 'Fast Low-Latency Sample (20 ms)', () => {
      updateRtt(20.0); render();
    });

    function updateRtt(sample) {
      sampleRtt = sample;
      // Jacobson / RFC 6298 EWMA formulas
      // RTTVAR = (1 - beta) * RTTVAR + beta * |SRTT - SampleRTT| (beta = 0.25)
      // SRTT = (1 - alpha) * SRTT + alpha * SampleRTT (alpha = 0.125)
      const alpha = 0.125;
      const beta = 0.25;
      rttvar = (1 - beta) * rttvar + beta * Math.abs(srtt - sample);
      srtt = (1 - alpha) * srtt + alpha * sample;
    }

    const cv = OS.canvas(host, {
      height: 180,
      label: 'Jacobson smoothed RTT and timeout graph',
      draw: (ctx, w, h) => {
        const rto = Math.round(srtt + 4 * rttvar);
        const colW = Math.min(180, (w - 70) / 3);

        const cards = [
          { name: 'SampleRTT', val: `${sampleRtt.toFixed(1)} ms`, color: OS.C.accent, desc: 'Latest ACK round-trip' },
          { name: 'Smoothed SRTT', val: `${srtt.toFixed(1)} ms`, color: OS.C.teal, desc: 'EWMA running average' },
          { name: 'Timeout RTO', val: `${rto} ms`, color: OS.C.rose, desc: 'SRTT + 4 × RTTVAR' }
        ];

        cards.forEach((c, idx) => {
          const bx = 25 + idx * (colW + 10);
          ctx.fillStyle = OS.rgba(c.color, 0.1);
          ctx.strokeStyle = c.color;
          ctx.lineWidth = 1.5;
          ctx.roundRect(bx, 25, colW, 110, 8);
          ctx.fill(); ctx.stroke();

          ctx.fillStyle = c.color;
          ctx.font = OS.font(11, 'mono', 600);
          ctx.fillText(c.name, bx + 12, 48);

          ctx.font = OS.font(18, 'mono', 700);
          ctx.fillStyle = OS.C.ink;
          ctx.fillText(c.val, bx + 12, 82);

          ctx.font = OS.font(9, 'sans', 400);
          ctx.fillStyle = OS.C.muted;
          ctx.fillText(c.desc, bx + 12, 110);
        });
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      const rto = Math.round(srtt + 4 * rttvar);
      readout.innerHTML = `
        <b>RFC 6298 Formula:</b> <code>RTO = SRTT + 4 × RTTVAR</code> = <b>${rto} ms</b>.<br>
        Setting RTO too short causes spurious retransmissions; setting RTO too long delays loss recovery. Jacobson's variance tracking adapts cleanly to jitter.
      `;
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 11. Bufferbloat & BBR vs Cubic Simulator
   * -------------------------------------------------------------------------- */
  OS.register('bufferbloat', function (host) {
    let mode = 'cubic'; // 'cubic' or 'bbr'
    let queuePackets = 120; // Packets trapped in buffer
    const BTL_CAP = 150; // Router queue capacity

    const controls = OS.controls(host);
    OS.segmented(controls, {
      label: 'Scheduler Engine',
      options: [
        { label: 'Loss-Based (TCP CUBIC)', value: 'cubic' },
        { label: 'Model-Based (Google BBR)', value: 'bbr' }
      ],
      value: mode,
      onChange: (v) => {
        mode = v;
        queuePackets = (v === 'cubic') ? 120 : 15;
        render();
      }
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'Bufferbloat queue saturation visualizer',
      draw: (ctx, w, h) => {
        const qY = 35;
        const qW = w - 50;

        ctx.fillStyle = OS.C.sunk;
        ctx.strokeStyle = OS.C.line;
        ctx.roundRect(25, qY, qW, 60, 6);
        ctx.fill(); ctx.stroke();

        const filledW = (qW * queuePackets) / BTL_CAP;
        ctx.fillStyle = mode === 'cubic' ? OS.rgba(OS.C.rose, 0.45) : OS.rgba(OS.C.teal, 0.45);
        ctx.fillRect(25, qY, filledW, 60);

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(`Router Bottleneck Buffer: ${queuePackets} / ${BTL_CAP} packets queued`, 35, qY + 34);

        const latency = mode === 'cubic' ? '450 ms (Bufferbloat Delay)' : '35 ms (Physical Min RTT)';
        ctx.fillStyle = mode === 'cubic' ? OS.C.rose : OS.C.green;
        ctx.font = OS.font(11, 'mono', 600);
        ctx.fillText(`RTT: ${latency}`, w - 260, qY + 34);

        ctx.fillStyle = OS.C.ink;
        ctx.font = OS.font(10, 'mono', 400);
        ctx.fillText(mode === 'cubic' ?
          '• Cubic fills the router queue to 100% capacity before detecting loss, inflating latency by 10×!' :
          '• BBR measures bottleneck bandwidth and paces delivery rate, keeping the queue nearly empty!', 25, 125);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      if (mode === 'cubic') {
        readout.innerHTML = `
          <b style="color:var(--rose)">Bufferbloat Detected:</b> Loss-based algorithms treat packet loss as the only signal of congestion. High-memory cheap routers buffer hundreds of megabytes, delaying packets by seconds without dropping them!
        `;
      } else {
        readout.innerHTML = `
          <b style="color:var(--green)">BBR Pacing Active:</b> BBR decouples packet pacing from buffer fullness. Latency remains at the speed-of-light minimum while maintaining 100% link utilization.
        `;
      }
    }
    render();
  });

  /* --------------------------------------------------------------------------
   * 12. SYN Flood Attack & SYN Cookie Defense
   * -------------------------------------------------------------------------- */
  OS.register('synCookie', function (host) {
    let cookiesActive = false;
    let backlogSize = 64; // Max half-open table
    let currentHalfOpen = 64; // Under attack

    const controls = OS.controls(host);
    OS.button(controls, 'Simulate SYN Flood Attack', () => {
      currentHalfOpen = backlogSize;
      cookiesActive = false;
      render();
    }, { primary: true });

    OS.button(controls, 'Enable SYN Cookies Defense', () => {
      cookiesActive = true;
      currentHalfOpen = 0; // Stateless! Zero memory stored in backlog table
      render();
    });

    OS.button(controls, 'Reset Server State', () => {
      cookiesActive = false; currentHalfOpen = 12; render();
    });

    const cv = OS.canvas(host, {
      height: 180,
      label: 'SYN flood attack and SYN cookie verification',
      draw: (ctx, w, h) => {
        // TCB Backlog Table Box
        ctx.fillStyle = (currentHalfOpen >= backlogSize && !cookiesActive) ? OS.rgba(OS.C.rose, 0.15) : OS.rgba(OS.C.green, 0.15);
        ctx.strokeStyle = (currentHalfOpen >= backlogSize && !cookiesActive) ? OS.C.rose : OS.C.green;
        ctx.lineWidth = 2;
        ctx.roundRect(25, 25, w - 50, 115, 8);
        ctx.fill(); ctx.stroke();

        ctx.fillStyle = (currentHalfOpen >= backlogSize && !cookiesActive) ? OS.C.rose : OS.C.green;
        ctx.font = OS.font(12, 'mono', 600);
        ctx.fillText(cookiesActive ? 'DEFENSE ACTIVE: STATELESS SYN COOKIES (TCB Table Bypassed)' :
          (currentHalfOpen >= backlogSize ? 'SERVER HALTED: SYN BACKLOG TABLE FULL (All new SYNs dropped!)' : 'SERVER OPERATIONAL'),
          35, 48);

        ctx.font = OS.font(10, 'mono', 400);
        ctx.fillStyle = OS.C.ink;
        ctx.fillText(`Half-Open Connection Entries: ${currentHalfOpen} / ${backlogSize}`, 35, 75);
        ctx.fillText(cookiesActive ?
          'Initial Sequence Number encoded as: ISN = HMAC(Client_IP, Client_Port, Timestamp, Secret_Key)' :
          'Stateful allocation: Server reserves 512 bytes of kernel RAM per incoming SYN packet.', 35, 98);
      }
    });

    const readout = OS.readout(host);
    function render() {
      cv.redraw();
      if (cookiesActive) {
        readout.innerHTML = `
          <b>SYN Cookie Principle:</b> Server allocates <b>zero memory</b> upon receiving a SYN packet. The entire state is cryptographically hashed into the 32-bit Initial Sequence Number (ISN). When the legitimate client sends ACK, the server recomputes the hash to verify authenticity.
        `;
      } else {
        readout.innerHTML = `
          <b>SYN Flood Attack:</b> Attacker floods spoofed SYN packets and never replies with ACK. The server's <code>listen(backlog)</code> queue fills up, denying service to legitimate clients.
        `;
      }
    }
    render();
  });

})();
