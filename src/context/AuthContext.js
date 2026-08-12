import React, { createContext, useState, useEffect, useContext } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from 'firebase/auth';
import {
    doc,
    setDoc,
    updateDoc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs,
    arrayUnion
} from 'firebase/firestore';
import { auth, db } from '../services/Firebase';
import { Alert } from 'react-native';

const AuthContext = createContext();

const gerarCodigo = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [familyData, setFamilyData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubUserDoc = null;
        let unsubFamilyDoc = null;

        const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (unsubUserDoc) unsubUserDoc();
            if (unsubFamilyDoc) unsubFamilyDoc();

            if (firebaseUser) {
                const userRef = doc(db, 'users', firebaseUser.uid);

                unsubUserDoc = onSnapshot(userRef, async (userSnap) => {
                    if (userSnap.exists()) {
                        const uData = userSnap.data();
                        setUserProfile(uData);

                        if (uData.familyId) {
                            const famRef = doc(db, 'familias', uData.familyId);
                            if (unsubFamilyDoc) unsubFamilyDoc();

                            unsubFamilyDoc = onSnapshot(famRef, async (famSnap) => {
                                if (famSnap.exists()) {
                                    setFamilyData(famSnap.data());
                                    setLoading(false);
                                } else {
                                    await autoCriarPerfilEFamillia(firebaseUser);
                                }
                            }, (err) => {
                                console.error("Erro na escuta da família:", err);
                                setLoading(false);
                            });
                        } else {
                            await autoCriarPerfilEFamillia(firebaseUser);
                        }
                    } else {
                        await autoCriarPerfilEFamillia(firebaseUser);
                    }
                }, (err) => {
                    console.error("Erro na escuta do utilizador:", err);
                    setLoading(false);
                });
            } else {
                setUserProfile(null);
                setFamilyData(null);
                setLoading(false);
            }
        });

        return () => {
            unsubAuth();
            if (unsubUserDoc) unsubUserDoc();
            if (unsubFamilyDoc) unsubFamilyDoc();
        };
    }, []);

    // Função de auto-reparação para criar perfil Firestore e família solo
    const autoCriarPerfilEFamillia = async (firebaseUser) => {
        const newFamId = `fam_${firebaseUser.uid.slice(0, 8)}`;
        const nomeUser = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilizador';
        const novoCodigoConvite = gerarCodigo();

        try {
            await setDoc(doc(db, 'familias', newFamId), {
                id: newFamId,
                nome: `Família de ${nomeUser}`,
                codigoConvite: novoCodigoConvite,
                criadoPor: firebaseUser.uid,
                membros: [
                    {
                        uid: firebaseUser.uid,
                        nome: nomeUser,
                        email: firebaseUser.email || '',
                        renda: 0,
                        role: 'admin'
                    }
                ],
                despesasFixas: [],
                limitesCategorias: {}
            }, { merge: true });

            await setDoc(doc(db, 'users', firebaseUser.uid), {
                uid: firebaseUser.uid,
                nome: nomeUser,
                email: firebaseUser.email || '',
                familyId: newFamId,
                criadoEm: Date.now()
            }, { merge: true });

        } catch (err) {
            console.error("Erro no auto-criamento do perfil/família:", err);
            setLoading(false);
        }
    };

    // 1. REGISTAR NOVO UTILIZADOR
    const signup = async (nome, email, password, codigoConvite = '') => {
        try {
            setLoading(true);

            const nomeFormatado = nome.trim() || 'Utilizador';
            const codigoFormatado = codigoConvite.trim().toUpperCase();

            let targetFamilyId = '';
            if (codigoFormatado) {
                try {
                    const q = query(collection(db, 'familias'), where('codigoConvite', '==', codigoFormatado));
                    const querySnap = await getDocs(q);

                    if (!querySnap.empty) {
                        targetFamilyId = querySnap.docs[0].id;
                    } else {
                        setLoading(false);
                        Alert.alert("Aviso", "O código de convite introduzido não é válido.");
                        return false;
                    }
                } catch (qErr) {
                    console.error("Erro a validar código de convite:", qErr);
                }
            }

            // Criar conta no Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const newUid = userCredential.user.uid;

            await updateProfile(userCredential.user, { displayName: nomeFormatado });

            if (targetFamilyId) {
                const novoMembro = {
                    uid: newUid,
                    nome: nomeFormatado,
                    email: email.trim(),
                    renda: 0,
                    role: 'membro'
                };

                await updateDoc(doc(db, 'familias', targetFamilyId), {
                    membros: arrayUnion(novoMembro)
                }).catch(e => console.error("Erro ao adicionar membro:", e));

                await setDoc(doc(db, 'users', newUid), {
                    uid: newUid,
                    nome: nomeFormatado,
                    email: email.trim(),
                    familyId: targetFamilyId,
                    criadoEm: Date.now()
                }, { merge: true }).catch(e => console.error("Erro ao criar perfil:", e));
            } else {
                const finalFamilyId = `fam_${newUid.slice(0, 8)}`;
                const novoCodigoConvite = gerarCodigo();

                await setDoc(doc(db, 'familias', finalFamilyId), {
                    id: finalFamilyId,
                    nome: `Família de ${nomeFormatado}`,
                    codigoConvite: novoCodigoConvite,
                    criadoPor: newUid,
                    membros: [
                        {
                            uid: newUid,
                            nome: nomeFormatado,
                            email: email.trim(),
                            renda: 0,
                            role: 'admin'
                        }
                    ],
                    despesasFixas: [],
                    limitesCategorias: {}
                }, { merge: true }).catch(e => console.error("Erro ao criar família solo:", e));

                await setDoc(doc(db, 'users', newUid), {
                    uid: newUid,
                    nome: nomeFormatado,
                    email: email.trim(),
                    familyId: finalFamilyId,
                    criadoEm: Date.now()
                }, { merge: true }).catch(e => console.error("Erro ao criar perfil:", e));
            }

            setLoading(false);
            return true;
        } catch (error) {
            setLoading(false);
            console.error("Erro completo no signup:", error);

            let msg = error.message || "Erro ao efetuar registo.";
            if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já está em utilização.";
            if (error.code === 'auth/weak-password') msg = "A palavra-passe deve ter pelo menos 6 caracteres.";
            if (error.code === 'auth/invalid-email') msg = "E-mail inválido.";
            if (error.code === 'auth/operation-not-allowed') msg = "O início de sessão com Email/Password não está ativado na consola do Firebase.";

            Alert.alert("Erro de Registo", `${msg} (${error.code || 'Desconhecido'})`);
            throw error;
        }
    };

    // 2. INICIAR SESSÃO (LOGIN)
    const login = async (email, password) => {
        try {
            setLoading(true);
            await signInWithEmailAndPassword(auth, email.trim(), password);
            setLoading(false);
            return true;
        } catch (error) {
            setLoading(false);
            console.error("Erro completo no login:", error);

            let msg = error.message || "E-mail ou palavra-passe incorretos.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                msg = "Credenciais incorretas.";
            }
            if (error.code === 'auth/invalid-email') msg = "E-mail inválido.";
            if (error.code === 'auth/operation-not-allowed') msg = "O início de sessão com Email/Password não está ativado na consola do Firebase.";

            Alert.alert("Erro de Autenticação", `${msg} (${error.code || 'Desconhecido'})`);
            throw error;
        }
    };

    // 3. TERMINAR SESSÃO (LOGOUT)
    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
            setFamilyData(null);
        } catch (error) {
            Alert.alert("Erro", "Erro ao terminar sessão.");
        }
    };

    // 4. JUNTAR A UMA FAMÍLIA POR CÓDIGO (Quando já autenticado)
    const joinFamilyByCode = async (codigoConvite) => {
        if (!user || !userProfile) return;
        const codigoFormatado = codigoConvite.trim().toUpperCase();

        try {
            setLoading(true);
            const q = query(collection(db, 'familias'), where('codigoConvite', '==', codigoFormatado));
            const querySnap = await getDocs(q);

            if (querySnap.empty) {
                setLoading(false);
                Alert.alert("Aviso", "Código de convite inválido ou não encontrado.");
                return false;
            }

            const targetFamDoc = querySnap.docs[0];
            const targetFamId = targetFamDoc.id;
            const targetData = targetFamDoc.data();

            if (targetData.membros?.some(m => m.uid === user.uid)) {
                setLoading(false);
                Alert.alert("Aviso", "Já pertencias a este grupo familiar.");
                return true;
            }

            const novoMembro = {
                uid: user.uid,
                nome: userProfile.nome || user.displayName || 'Membro',
                email: user.email,
                renda: 0,
                role: 'membro'
            };

            await updateDoc(doc(db, 'familias', targetFamId), {
                membros: arrayUnion(novoMembro)
            });

            await updateDoc(doc(db, 'users', user.uid), {
                familyId: targetFamId
            });

            setLoading(false);
            Alert.alert("Sucesso!", `Juntaste-te à ${targetData.nome}!`);
            return true;
        } catch (error) {
            setLoading(false);
            Alert.alert("Erro", "Erro ao juntar à família.");
            return false;
        }
    };

    // 5. REGERAR CÓDIGO DE CONVITE (ADMIN)
    const regenerateInviteCode = async () => {
        if (!familyData) return;
        const novoCodigo = gerarCodigo();
        try {
            await updateDoc(doc(db, 'familias', familyData.id), {
                codigoConvite: novoCodigo
            });
            Alert.alert("Sucesso", `Novo código de convite: ${novoCodigo}`);
        } catch (error) {
            Alert.alert("Erro", "Erro ao gerar novo código.");
        }
    };

    // 6. ALTERAR NOME DA FAMÍLIA (ADMIN)
    const updateFamilyName = async (novoNome) => {
        if (!familyData || !novoNome.trim()) return;
        try {
            await updateDoc(doc(db, 'familias', familyData.id), {
                nome: novoNome.trim()
            });
        } catch (error) {
            Alert.alert("Erro", "Erro ao alterar nome da família.");
        }
    };

    // 7. PROMOVER A ADMIN (ADMIN)
    const promoteToAdmin = async (targetUid) => {
        if (!familyData) return;
        try {
            const membrosAtualizados = familyData.membros.map(m => {
                if (m.uid === targetUid) return { ...m, role: 'admin' };
                return m;
            });
            await updateDoc(doc(db, 'familias', familyData.id), {
                membros: membrosAtualizados
            });
            Alert.alert("Sucesso", "Membro promovido a Administrador!");
        } catch (error) {
            Alert.alert("Erro", "Erro ao promover membro.");
        }
    };

    // 8. REMOVER MEMBRO DA FAMÍLIA
    const removeMember = async (targetUid) => {
        if (!familyData) return;
        try {
            const membroARemover = familyData.membros.find(m => m.uid === targetUid);
            if (!membroARemover) return;

            const membrosRestantes = familyData.membros.filter(m => m.uid !== targetUid);
            await updateDoc(doc(db, 'familias', familyData.id), {
                membros: membrosRestantes
            });

            const newSoloFamId = `fam_${targetUid.slice(0, 8)}`;
            const novoCodigo = gerarCodigo();

            await setDoc(doc(db, 'familias', newSoloFamId), {
                id: newSoloFamId,
                nome: `Família de ${membroARemover.nome}`,
                codigoConvite: novoCodigo,
                criadoPor: targetUid,
                membros: [
                    {
                        uid: targetUid,
                        nome: membroARemover.nome,
                        email: membroARemover.email,
                        renda: membroARemover.renda || 0,
                        role: 'admin'
                    }
                ],
                despesasFixas: [],
                limitesCategorias: {}
            }, { merge: true });

            await updateDoc(doc(db, 'users', targetUid), {
                familyId: newSoloFamId
            });

            Alert.alert("Concluído", `${membroARemover.nome} foi separado do grupo.`);
        } catch (error) {
            Alert.alert("Erro", "Erro ao remover membro.");
        }
    };

    const currentMember = familyData?.membros?.find(m => m.uid === user?.uid);
    const isAdmin = currentMember?.role === 'admin';

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            familyData,
            loading,
            isAdmin,
            currentMember,
            signup,
            login,
            logout,
            joinFamilyByCode,
            regenerateInviteCode,
            updateFamilyName,
            promoteToAdmin,
            removeMember,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
}
