/**
 * Chart.js Custom Strategy Overlay Plugin
 * Draws institutional price lines and shaded bands for:
 * 1. Entry Range Zone (shaded channel)
 * 2. Stop Loss (Red dashed line + badge)
 * 3. Target 1 (Green dashed line + badge)
 * 4. Target 2 (Solid Emerald line + badge)
 * 5. Current Market Price (CMP) (Pulsing dashed line + badge)
 */

export const strategyOverlayPlugin = {
  id: 'strategyOverlay',
  afterDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const yScale = scales?.y;
    if (!yScale || !chartArea) return;

    const pluginOpts = chart.config.options?.plugins?.strategyOverlay;
    if (!pluginOpts || !pluginOpts.strategy) return;

    const { strategy, currencySymbol = '₹' } = pluginOpts;
    const { stopLoss, target1, target2, entryMin, entryMax, currentPrice, direction } = strategy;
    const isShort = direction === 'SHORT';

    ctx.save();

    // 1. Shaded Entry Zone Channel
    if (entryMin != null && entryMax != null && !isNaN(entryMin) && !isNaN(entryMax)) {
      const yTop = yScale.getPixelForValue(Math.max(entryMin, entryMax));
      const yBottom = yScale.getPixelForValue(Math.min(entryMin, entryMax));
      if (yTop != null && yBottom != null) {
        const topClamped = Math.max(chartArea.top, Math.min(chartArea.bottom, yTop));
        const bottomClamped = Math.max(chartArea.top, Math.min(chartArea.bottom, yBottom));
        const height = Math.abs(bottomClamped - topClamped);

        if (height > 0) {
          ctx.fillStyle = isShort ? 'rgba(245, 158, 11, 0.10)' : 'rgba(0, 242, 254, 0.10)';
          ctx.fillRect(chartArea.left, topClamped, chartArea.width, height);

          // Boundaries
          ctx.strokeStyle = isShort ? 'rgba(245, 158, 11, 0.40)' : 'rgba(0, 242, 254, 0.40)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(chartArea.left, topClamped);
          ctx.lineTo(chartArea.right, topClamped);
          ctx.moveTo(chartArea.left, bottomClamped);
          ctx.lineTo(chartArea.right, bottomClamped);
          ctx.stroke();
        }
      }
    }

    // Helper to render horizontal line and floating price badge on the right edge
    const drawLevelLine = (price, color, label, lineDash = [5, 4], isBold = false) => {
      if (price == null || isNaN(price)) return;
      const y = yScale.getPixelForValue(price);
      if (y < chartArea.top - 8 || y > chartArea.bottom + 8) return;

      const badgeWidth = 96;
      const badgeHeight = 18;
      const badgeX = chartArea.right - badgeWidth;
      const badgeY = Math.max(chartArea.top, Math.min(chartArea.bottom - badgeHeight, y - badgeHeight / 2));

      // 1. Line across chart (stopping before badge)
      ctx.setLineDash(lineDash);
      ctx.strokeStyle = color;
      ctx.lineWidth = isBold ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(badgeX - 4, y);
      ctx.stroke();

      // 2. Badge Rounded Rectangle
      ctx.setLineDash([]);
      ctx.fillStyle = color;
      const r = 4;
      ctx.beginPath();
      ctx.moveTo(badgeX + r, badgeY);
      ctx.lineTo(badgeX + badgeWidth - r, badgeY);
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + r);
      ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - r);
      ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - r, badgeY + badgeHeight);
      ctx.lineTo(badgeX + r, badgeY + badgeHeight);
      ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - r);
      ctx.lineTo(badgeX, badgeY + r);
      ctx.quadraticCurveTo(badgeX, badgeY, badgeX + r, badgeY);
      ctx.closePath();
      ctx.fill();

      // 3. Badge Text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
    };

    // Draw Stop Loss Line (Red)
    if (stopLoss != null) {
      drawLevelLine(stopLoss, '#f43f5e', `🛑 SL: ${currencySymbol}${Number(stopLoss).toFixed(1)}`, [4, 4], true);
    }

    // Draw Target 1 Line (Green)
    if (target1 != null) {
      drawLevelLine(target1, '#10b981', `🎯 T1: ${currencySymbol}${Number(target1).toFixed(1)}`, [4, 4], false);
    }

    // Draw Target 2 Line (Emerald)
    if (target2 != null) {
      drawLevelLine(target2, '#059669', `🏆 T2: ${currencySymbol}${Number(target2).toFixed(1)}`, [], true);
    }

    // Draw Current Spot Price Line (Cyan / Amber)
    if (currentPrice != null) {
      const spotColor = isShort ? '#f59e0b' : '#00f2fe';
      drawLevelLine(currentPrice, spotColor, `CMP: ${currencySymbol}${Number(currentPrice).toFixed(1)}`, [2, 2], true);
    }

    ctx.restore();
  }
};

/**
 * Chart.js Custom TradingView-Style Stochastic Plugin
 * Renders:
 * 1. Shaded region between 20 (oversold) and 80 (overbought)
 * 2. Dashed horizontal reference lines at 80.00 and 20.00
 * 3. Right-axis colored floating badges for %K (TradingView Blue #2962ff) and %D (TradingView Orange #ff6d00)
 * 4. Header indicator title: "Stoch 14 3 3   [K val in blue]   [D val in orange]"
 */
export const tradingViewStochPlugin = {
  id: 'tradingViewStoch',
  afterDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const yScale = scales?.y;
    if (!yScale || !chartArea) return;

    const opts = chart.config.options?.plugins?.tradingViewStoch || {};
    const {
      kVal = null,
      dVal = null,
      kPeriod = 14,
      kSmooth = 3,
      dPeriod = 3,
      overbought = 80,
      oversold = 20,
      showLevels = true,
      showBadges = true,
      showLegend = true,
      isDarkMode = true
    } = opts;

    ctx.save();

    // 1. Shaded Region between 20 and 80
    if (showLevels) {
      const y80 = yScale.getPixelForValue(overbought);
      const y20 = yScale.getPixelForValue(oversold);
      if (y80 != null && y20 != null) {
        const top = Math.min(y80, y20);
        const bottom = Math.max(y80, y20);
        ctx.fillStyle = isDarkMode ? 'rgba(41, 98, 255, 0.05)' : 'rgba(33, 150, 243, 0.05)';
        ctx.fillRect(chartArea.left, top, chartArea.width, bottom - top);

        // Dashed lines at 80 and 20
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = isDarkMode ? 'rgba(148, 163, 184, 0.45)' : 'rgba(100, 116, 139, 0.45)';

        // 80 line
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y80);
        ctx.lineTo(chartArea.right, y80);
        ctx.stroke();

        // 20 line
        ctx.beginPath();
        ctx.moveTo(chartArea.left, y20);
        ctx.lineTo(chartArea.right, y20);
        ctx.stroke();
      }
    }

    // 2. Right-Axis Badges for %K (Blue) and %D (Orange)
    if (showBadges) {
      let curK = kVal;
      let curD = dVal;
      const dsets = chart.data?.datasets || [];
      if (curK == null && dsets[0]?.data?.length) {
        curK = dsets[0].data[dsets[0].data.length - 1];
      }
      if (curD == null && dsets[1]?.data?.length) {
        curD = dsets[1].data[dsets[1].data.length - 1];
      }

      const drawAxisBadge = (val, color, isBlue) => {
        if (val == null || isNaN(val)) return null;
        const y = yScale.getPixelForValue(val);
        if (y < chartArea.top - 6 || y > chartArea.bottom + 6) return null;
        return { val, color, y, isBlue };
      };

      const badges = [];
      if (curD != null) badges.push(drawAxisBadge(curD, '#ff6d00', false));
      if (curK != null) badges.push(drawAxisBadge(curK, '#2962ff', true));

      const validBadges = badges.filter(Boolean);
      if (validBadges.length === 2) {
        // Handle collision avoidance if values are within 18px
        const diff = Math.abs(validBadges[0].y - validBadges[1].y);
        if (diff < 18) {
          const shift = (18 - diff) / 2;
          if (validBadges[0].y < validBadges[1].y) {
            validBadges[0].y -= shift;
            validBadges[1].y += shift;
          } else {
            validBadges[0].y += shift;
            validBadges[1].y -= shift;
          }
        }
      }

      ctx.setLineDash([]);
      for (const b of validBadges) {
        const badgeWidth = 46;
        const badgeHeight = 18;
        const badgeX = chartArea.right + 2;
        const badgeY = Math.max(chartArea.top, Math.min(chartArea.bottom - badgeHeight, b.y - badgeHeight / 2));

        // Connecting tick
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(chartArea.right - 4, b.y);
        ctx.lineTo(badgeX, b.y);
        ctx.stroke();

        // Rounded badge
        ctx.fillStyle = b.color;
        const r = 3;
        ctx.beginPath();
        ctx.moveTo(badgeX + r, badgeY);
        ctx.lineTo(badgeX + badgeWidth - r, badgeY);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + r);
        ctx.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - r);
        ctx.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - r, badgeY + badgeHeight);
        ctx.lineTo(badgeX + r, badgeY + badgeHeight);
        ctx.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - r);
        ctx.lineTo(badgeX, badgeY + r);
        ctx.quadraticCurveTo(badgeX, badgeY, badgeX + r, badgeY);
        ctx.closePath();
        ctx.fill();

        // Value text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Number(b.val).toFixed(2), badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
      }
    }

    // 3. Top-left Indicator Header Legend (TradingView Style)
    if (showLegend) {
      let curK = kVal;
      let curD = dVal;
      const dsets = chart.data?.datasets || [];
      if (curK == null && dsets[0]?.data?.length) {
        curK = dsets[0].data[dsets[0].data.length - 1];
      }
      if (curD == null && dsets[1]?.data?.length) {
        curD = dsets[1].data[dsets[1].data.length - 1];
      }

      const padX = chartArea.left + 8;
      const padY = chartArea.top + 14;

      ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      const titleText = `Stoch ${kPeriod} ${kSmooth} ${dPeriod}`;
      ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b';
      ctx.fillText(titleText, padX, padY);

      const titleWidth = ctx.measureText(titleText).width;
      let cursorX = padX + titleWidth + 10;

      if (curK != null) {
        ctx.fillStyle = '#2962ff';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        const kStr = Number(curK).toFixed(2);
        ctx.fillText(kStr, cursorX, padY);
        cursorX += ctx.measureText(kStr).width + 8;
      }

      if (curD != null) {
        ctx.fillStyle = '#ff6d00';
        ctx.font = 'bold 11px "JetBrains Mono", monospace';
        const dStr = Number(curD).toFixed(2);
        ctx.fillText(dStr, cursorX, padY);
      }
    }

    ctx.restore();
  }
};

