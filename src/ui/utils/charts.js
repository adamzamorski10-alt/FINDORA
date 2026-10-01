/**
 * Lightweight SVG chart utilities for FINDORA dashboard analytics.
 *
 * These helpers are presentation-only. All financial values come from
 * existing application/reporting modules. No domain logic lives here.
 */

const NS = 'http://www.w3.org/2000/svg';
const canCreateSVG = typeof document !== 'undefined' && typeof document.createElementNS === 'function';

import { t } from '../i18n.js';

export function createLineChart(options) {
  const {
    data = [],
    width = 600,
    height = 220,
    padding = { top: 20, right: 20, bottom: 30, left: 50 },
    lines = [],
    yMin,
    yMax,
    xLabel = '',
    yLabel = '',
  } = options;

  if (!canCreateSVG) {
    return createEmptyChart(width, height, padding, xLabel, yLabel);
  }

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const allValues = [];
  for (const line of lines) {
    for (const point of line.data) {
      allValues.push(point.value);
    }
  }
  if (allValues.length === 0) {
    return createEmptyChart(width, height, padding, xLabel, yLabel);
  }

  const minVal = typeof yMin === 'number' ? yMin : Math.min(0, ...allValues);
  const maxVal = typeof yMax === 'number' ? yMax : Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const xScale = (index) => padding.left + (innerWidth / Math.max(data.length - 1, 1)) * index;
  const yScale = (value) => padding.top + innerHeight - ((value - minVal) / range) * innerHeight;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', options.ariaLabel || 'Chart');
  svg.style.display = 'block';
  svg.style.overflow = 'visible';

  const desc = document.createElementNS(NS, 'desc');
  desc.textContent = options.ariaLabel || 'Chart';
  svg.appendChild(desc);

  const gridGroup = document.createElementNS(NS, 'g');
  gridGroup.setAttribute('class', 'chart-grid');
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (innerHeight / 4) * i;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', padding.left);
    line.setAttribute('x2', width - padding.right);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', 'rgba(255,255,255,0.06)');
    line.setAttribute('stroke-width', '1');
    gridGroup.appendChild(line);
  }
  svg.appendChild(gridGroup);

  for (const lineConfig of lines) {
    const lineGroup = document.createElementNS(NS, 'g');
    lineGroup.setAttribute('class', 'chart-line-group');

    if (lineConfig.data.length > 1) {
      const areaPoints = lineConfig.data.map((point, i) => {
        const x = xScale(i);
        const y = yScale(point.value);
        return `${x},${y}`;
      }).join(' ');

      const area = document.createElementNS(NS, 'polygon');
      const areaPointsStr = `${padding.left},${yScale(0)} ${areaPoints} ${xScale(lineConfig.data.length - 1)},${yScale(0)}`;
      area.setAttribute('points', areaPointsStr);
      area.setAttribute('fill', lineConfig.color || 'rgba(59,130,246,0.08)');
      area.setAttribute('stroke', 'none');
      lineGroup.appendChild(area);

      const path = document.createElementNS(NS, 'polyline');
      path.setAttribute('points', areaPoints);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', lineConfig.color || 'var(--color-primary)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('stroke-linejoin', 'round');
      lineGroup.appendChild(path);
    }

    for (let i = 0; i < lineConfig.data.length; i++) {
      const point = lineConfig.data[i];
      const cx = xScale(i);
      const cy = yScale(point.value);

      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', lineConfig.color || 'var(--color-primary)');
      circle.setAttribute('stroke', 'var(--color-surface)');
      circle.setAttribute('stroke-width', '2');
      lineGroup.appendChild(circle);

      const title = document.createElementNS(NS, 'title');
      title.textContent = `${point.label || ''}: ${typeof point.value === 'number' ? formatCurrency(point.value) : point.value}`;
      circle.appendChild(title);
    }

    svg.appendChild(lineGroup);
  }

  const xAxisLabels = data.map((label, i) => {
    if (data.length <= 1) {
      const text = document.createElementNS(NS, 'text');
      text.setAttribute('x', padding.left);
      text.setAttribute('y', height - 8);
      text.setAttribute('text-anchor', 'start');
      text.setAttribute('fill', 'var(--color-text-muted)');
      text.setAttribute('font-size', '10');
      text.setAttribute('font-family', 'inherit');
      text.textContent = label;
      return text;
    }
    const x = xScale(i);
    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', height - 8);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('fill', 'var(--color-text-muted)');
    text.setAttribute('font-size', '10');
    text.setAttribute('font-family', 'inherit');
    text.textContent = label;
    return text;
  });
  const axisGroup = document.createElementNS(NS, 'g');
  xAxisLabels.forEach((text) => axisGroup.appendChild(text));
  svg.appendChild(axisGroup);

  return svg;
}

export function createHorizontalBarChart(options) {
  const {
    data = [],
    width = 500,
    height = 300,
    padding = { top: 10, right: 80, bottom: 10, left: 120 },
    color = 'var(--color-primary)',
    backgroundColor = 'rgba(255,255,255,0.04)',
  } = options;

  if (!canCreateSVG) {
    return createEmptyChart(width, height, padding, '', '');
  }

  const innerHeight = height - padding.top - padding.bottom;
  const barHeight = Math.min(28, innerHeight / Math.max(data.length, 1) - 6);
  const maxValue = Math.max(...data.map(d => d.value), 1);
  const innerWidth = width - padding.left - padding.right;

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', options.ariaLabel || 'Bar chart');
  svg.style.display = 'block';
  svg.style.overflow = 'visible';

  const desc = document.createElementNS(NS, 'desc');
  desc.textContent = options.ariaLabel || 'Bar chart';
  svg.appendChild(desc);

  data.forEach((item, index) => {
    const y = padding.top + index * (innerHeight / Math.max(data.length, 1)) + (innerHeight / Math.max(data.length, 1) - barHeight) / 2;
    const barWidth = Math.max((item.value / maxValue) * innerWidth, 0);

    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', padding.left - 8);
    label.setAttribute('y', y + barHeight / 2 + 4);
    label.setAttribute('text-anchor', 'end');
    label.setAttribute('fill', 'var(--color-text-secondary)');
    label.setAttribute('font-size', '11');
    label.setAttribute('font-family', 'inherit');
    label.textContent = item.label;
    svg.appendChild(label);

    const track = document.createElementNS(NS, 'rect');
    track.setAttribute('x', padding.left);
    track.setAttribute('y', y);
    track.setAttribute('width', innerWidth);
    track.setAttribute('height', barHeight);
    track.setAttribute('rx', '4');
    track.setAttribute('fill', backgroundColor);
    svg.appendChild(track);

    const bar = document.createElementNS(NS, 'rect');
    bar.setAttribute('x', padding.left);
    bar.setAttribute('y', y);
    bar.setAttribute('width', barWidth);
    bar.setAttribute('height', barHeight);
    bar.setAttribute('rx', '4');
    bar.setAttribute('fill', item.color || color);
    svg.appendChild(bar);

    const valueText = document.createElementNS(NS, 'text');
    valueText.setAttribute('x', padding.left + barWidth + 8);
    valueText.setAttribute('y', y + barHeight / 2 + 4);
    valueText.setAttribute('fill', 'var(--color-text-secondary)');
    valueText.setAttribute('font-size', '11');
    valueText.setAttribute('font-family', 'inherit');
    valueText.setAttribute('font-variant-numeric', 'tabular-nums');
    valueText.textContent = formatCurrency(item.value);
    svg.appendChild(valueText);
  });

  return svg;
}

function createEmptyChart(width, height, padding, xLabel, yLabel) {
  if (!canCreateSVG) {
    const div = document.createElement('div');
    div.textContent = t('common.noData');
    div.style.color = 'var(--color-text-muted)';
    div.style.fontSize = '12px';
    div.style.fontFamily = 'inherit';
    return div;
  }

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.display = 'block';

  const desc = document.createElementNS(NS, 'desc');
  desc.textContent = t('common.noData');
  svg.appendChild(desc);

  const text = document.createElementNS(NS, 'text');
  text.setAttribute('x', width / 2);
  text.setAttribute('y', height / 2);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('fill', 'var(--color-text-muted)');
  text.setAttribute('font-size', '12');
  text.setAttribute('font-family', 'inherit');
  text.textContent = t('common.noData');
  svg.appendChild(text);

  return svg;
}

function formatCurrency(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Number(value).toFixed(2);
}
