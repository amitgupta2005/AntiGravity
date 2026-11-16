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
