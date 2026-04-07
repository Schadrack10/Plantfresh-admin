import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User, CreateUserData, Role } from '../../types';

export class UserService {
  private usersRef = collection(db, 'Users');

  async createUser(data: CreateUserData, userId: string): Promise<string> {
    const userRef = doc(this.usersRef, userId);
    const userData: User = {
      Email: data.Email,
      TenantId: data.TenantId,
      Role: data.Role,
      CreatedAt: new Date()
    };

    await setDoc(userRef, userData);
    return userId;
  }

  async getUser(userId: string): Promise<User | null> {
    const docSnap = await getDoc(doc(this.usersRef, userId));
    if (!docSnap.exists()) return null;
    return { ...docSnap.data(), Id: docSnap.id } as User;
  }

  async getTenantUsers(tenantId: string): Promise<User[]> {
    const q = query(this.usersRef, where('TenantId', '==', tenantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docItem) => ({ ...docItem.data(), Id: docItem.id } as User));
  }

  async updateUserRole(userId: string, role: Role): Promise<void> {
    await updateDoc(doc(this.usersRef, userId), { Role: role });
  }

  async deleteUser(userId: string): Promise<void> {
    await deleteDoc(doc(this.usersRef, userId));
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const q = query(this.usersRef, where('Email', '==', email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const document = snapshot.docs[0];
    return { ...document.data(), Id: document.id } as User;
  }

  async userExistsInTenant(email: string, tenantId: string): Promise<boolean> {
    const q = query(this.usersRef, where('Email', '==', email), where('TenantId', '==', tenantId));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }
}

export const userService = new UserService();
