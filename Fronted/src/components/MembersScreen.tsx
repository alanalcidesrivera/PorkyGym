import { useEffect, useState } from 'react';
import api from '../services/api';

export const MembersScreen = () => {
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    api.get('socios/')
      .then((response: any) => {
        setMembers(response.data);
      })
      .catch((error: any) => {
        console.error('Error conectando a la API:', error);
      });
  }, []);

  return (
    <div className="p-6 text-white">
      <h2 className="font-bebas text-3xl text-[#E2FF00] mb-4">SOCIOS REGISTRADOS (POSTGRESQL)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member: any) => (
          <div key={member.id} className="p-4 bg-[#1c1b1b] border border-white/10">
            <p className="font-bold text-lg text-white">{member.nombre || member.name}</p>
            <p className="text-sm text-[#c6c9ab]">{member.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
};