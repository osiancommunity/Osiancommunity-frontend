export default function LeaderboardHero({ top3, onOpen }){
  return (
    <div className="lb-hero" aria-live="polite">
      {top3.map((x, i)=>{
        const cls = i===0?'lb-hero-card gold':i===1?'lb-hero-card silver':'lb-hero-card bronze';
        const initials = (x.display_name||'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
        return (
          <div key={x.user_id} className={cls} role="button" tabIndex={0} onClick={()=>onOpen(x)}>
            <div className="medal">{x.rank}</div>
            {x.avatar_url ? <img src={x.avatar_url} loading="lazy" alt={x.display_name} className="avatar"/> : <div className="initials avatar">{initials}</div>}
            <div className="name">{x.display_name}</div>
            <div className="meta">{x.college||''}</div>
            <div className="score">{Math.round(x.composite_score)}</div>
          </div>
        );
      })}
    </div>
  );
}
