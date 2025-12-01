'use client';

import { useEffect, useState } from 'react';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
      setLoading(false);
    }
    fetchUsers();
  }, []);

  if (loading) {
    return <div style={{ padding: 20 }}>読み込み中...</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>ユーザー一覧</h1>

      {users.length === 0 ? (
        <p>まだユーザーがいません。</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>ID</th>
              <th>ユーザー名</th>
              <th>レート</th>
              <th>勝ち</th>
              <th>負け</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>{u.rating}</td>
                <td>{u.wins}</td>
                <td>{u.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
