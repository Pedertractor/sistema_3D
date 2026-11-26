import type { ListUser, Unit, UserRole } from '@/types/auth';
import api from '@/utils/axiosConfig';

export const usersApi = {
  async list() {
    const { data } = await api.get<{ users: ListUser[] }>('/users');
    return data.users;
  },
  async create(input: { cardNumber: string; unit: Unit; role: UserRole }) {
    const { data } = await api.post<{ user: ListUser }>('/users', input);
    return data.user;
  },
  async update(id: string, input: { name?: string; role?: UserRole; active?: boolean }) {
    const { data } = await api.patch<{ user: ListUser }>(`/users/${id}`, input);
    return data.user;
  },
  async resetPassword(id: string) {
    const { data } = await api.post<{ user: ListUser }>(`/users/${id}/reset-password`);
    return data.user;
  },
};
