export default function LeaderboardCard({ entries }) {
  return (
    <div className="leaderboard-card">
      <table className="quiz-history-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>User</th>
            <th>Score</th>
            <th>Attempts</th>
          </tr>
        </thead>
        <tbody>
          {(entries || []).map(e => (
            <tr key={e.user.id}>
              <td>{e.rank}</td>
              <td>{e.user.name}</td>
              <td>{Math.round(e.compositeScore)}</td>
              <td>{e.attempts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

