export default function ProfileModal({ open, onClose, item }){
  if (!open) return null;
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Profile modal" onClick={(e)=>{ if(e.target.classList.contains('modal')) onClose(); }}>
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>×</span>
        <div style={{display:'flex',gap:12,alignItems:'center'}}>
          {item.avatar_url ? <img src={item.avatar_url} alt={item.display_name} style={{width:'var(--avatar-md)',height:'var(--avatar-md)',borderRadius:'50%'}}/> : null}
          <div>
            <div style={{fontWeight:600}}>{item.display_name}</div>
            <div style={{color:'#6b7380'}}>{item.college||''}</div>
          </div>
        </div>
        <div style={{marginTop:12}}>Composite {Math.round(item.composite_score)} • Avg {Math.round(item.avg_score)} • Attempts {item.attempts}</div>
        <div style={{marginTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
          {(item.badges||[]).map(b=> <div key={b.id} className='badge'><span className='badge-icon'>🏅</span><span>{b.name}</span></div>)}
        </div>
      </div>
    </div>
  );
}
