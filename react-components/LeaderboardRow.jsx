export default function LeaderboardRow({ item, onOpen }){
  const initials = (item.display_name||'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const spark = (item.sparkline||[]).slice(0,20);
  const path = spark.map((v,i)=>`${i===0?'M':'L'} ${i*6} ${24 - Math.min(24, Math.max(0, v/5))}`).join(' ');
  return (
    <div className="lb-row" onClick={()=>onOpen(item)}>
      {item.avatar_url ? <img src={item.avatar_url} loading="lazy" alt={item.display_name} className="avatar"/> : <div className="initials">{initials}</div>}
      <div className="content">
        <div className="title">{item.rank}. {item.display_name}</div>
        <div className="meta">Avg {Math.round(item.avg_score)} • Attempts {item.attempts}</div>
        <svg className="spark" viewBox="0 0 120 24"><path d={path} stroke="#4C8DFF" fill="none" strokeWidth="2"/></svg>
        <div className="badges">{(item.badges||[]).map(b=> <div key={b.id} className="badge"><span className="badge-icon">🏅</span><span>{b.name}</span></div>)}</div>
      </div>
    </div>
  );
}
