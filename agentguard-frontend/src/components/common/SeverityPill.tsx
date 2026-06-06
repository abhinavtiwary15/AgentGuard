interface Props {
  severity?: string;
  label?: string;
  showDot?: boolean;
  blink?: boolean;
}

export function SeverityPill({ severity, label,
  showDot = true, blink = false }: Props) {

  if (!severity) return null;

  const styles = ({
    critical: { bg: 'var(--sev-critical-bg)',
                border: 'var(--sev-critical-border)',
                color: 'var(--sev-critical-text)' },
    high:     { bg: 'var(--sev-high-bg)',
                border: 'var(--sev-high-border)',
                color: 'var(--sev-high-text)' },
    medium:   { bg: 'var(--sev-medium-bg)',
                border: 'var(--sev-medium-border)',
                color: 'var(--sev-medium-text)' },
    low:      { bg: 'var(--sev-low-bg)',
                border: 'var(--sev-low-border)',
                color: 'var(--sev-low-text)' },
    info:     { bg: 'var(--sev-info-bg)',
                border: 'var(--sev-info-border)',
                color: 'var(--sev-info-text)' },
  } as Record<string, { bg: string; border: string; color: string }>)[
    severity?.toLowerCase() ?? 'info'
  ] ?? {
    bg: '#F2F0EC',
    border: 'rgba(0,0,0,0.1)',
    color: '#625e59',
  };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 8px',
      borderRadius: 99,
      background: styles.bg,
      border: `1px solid ${styles.border}`,
      color: styles.color,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {showDot && (
        <span style={{
          width: 6, height: 6,
          borderRadius: '50%',
          background: styles.color,
          flexShrink: 0,
          animation: blink ? 'pulse 1s infinite' : 'none',
        }}/>
      )}
      {(label ?? severity).toUpperCase()}
    </span>
  );
}

