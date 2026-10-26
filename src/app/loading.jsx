export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      width: '100%',
      gap: '16px'
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #E2E8F0',
        borderTop: '3px solid var(--color-deep-blue, #0F62FE)',
        borderRadius: '50%',
        animation: 'finSpin 0.7s linear infinite'
      }} />
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#64748B',
        letterSpacing: '0.02em'
      }}>
        Loading enterprise workspace...
      </div>
      <style>{`
        @keyframes finSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
