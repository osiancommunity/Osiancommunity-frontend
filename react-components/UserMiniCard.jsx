export default function UserMiniCard({ me, onView }){
  if (!me) return null;
  const initials = (me.display_name||'U').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  const arrow = '–';
  return (
    <div className="lb-user-mini active">
      {me.avatar_url ? <img src={me.avatar_url} loading="lazy" alt={me.display_name} className="avatar" style={{width:'var(--avatar-sm)',height:'var(--avatar-sm)'}}/> : <div className="initials" style={{width:'var(--avatar-sm)',height:'var(--avatar-sm)'}}>{initials}</div>}
      <div className="content">
        <div className="title">You • Rank {me.rank}</div>
        <div className="meta">{arrow} {Math.round(me.composite_score)}</div>
      </div>
      <button className="btn-edit" onClick={()=>onView(me)}>View profile</button>
    </div>
  );
}
