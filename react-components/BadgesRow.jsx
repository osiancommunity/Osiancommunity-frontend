export default function BadgesRow({ badges }) {
  return (
    <div className="badges-row">
      {(badges || []).map(b => (
        <div className="badge" title={b.description} key={b.code}>
          <span className="badge-icon">{b.icon || '🏅'}</span>
          <span className="badge-name">{b.name}</span>
        </div>
      ))}
    </div>
  );
}

