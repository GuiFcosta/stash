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
    getDoc,
    updateDoc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs,
    arrayUnion,
    arrayRemove
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
                // Escuta o perfil do utilizador em users/{uid}
                const userRef = doc(db, 'users', firebaseUser.uid);
                unsubUserDoc = onSnapshot(userRef, async (userSnap) => {
                    if (userSnap.exists()) {
                        const uData = userSnap.data();
                        setUserProfile(uData);

                        if (uData.familyId) {
                            // Escuta a família em familias/{familyId}
                            const famRef = doc(db, 'familias', uData.familyId);
                            if (unsubFamilyDoc) unsubFamilyDoc();

                            unsubFamilyDoc = onSnapshot(famRef, (famSnap) => {
                                if (famSnap.exists()) {
                                    setFamilyData(famSnap.data());
                                } else {
                                    setFamilyData(null);
                                }
                                setLoading(false);
                            }, (err) => {
                                console.error("Erro na escuta da família:", err);
                                setLoading(false);
                            });
                        } else {
                            setFamilyData(null);
                            setLoading(false);
                        }
                    } else {
                        setUserProfile(null);
                        setFamilyData(null);
                        setLoading(false);
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

    // 1. REGISTAR NOVO UTILIZADOR
    const signup = async (nome, email, password, codigoConvite = '') => {
        try {
            setLoading(true);
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const newUid = userCredential.user.uid;
            const nomeFormatado = nome.trim() || 'Utilizador';

            await updateProfile(userCredential.user, { displayName: nomeFormatado });

            let finalFamilyId = '';
            const codigoFormatado = codigoConvite.trim().toUpperCase();

            if (codigoFormatado) {
                // Procurar família pelo código de convite
                const q = query(collection(db, 'familias'), where('codigoConvite', '==', codigoFormatado));
                const querySnap = await getDocs(q);

                if (!querySnap.empty) {
                    const famDoc = querySnap.docs[0];
                    finalFamilyId = famDoc.id;

                    const novoMembro = {
                        uid: newUid,
                        nome: nomeFormatado,
                        email: email.trim(),
                        renda: 0,
                        role: 'membro'
                    };

                    await updateDoc(doc(db, 'familias', finalFamilyId), {
                        membros: arrayUnion(novoMembro)
                    });
                } else {
                    Alert.alert("Aviso", "Código de convite não encontrado. Criámos um grupo solo para ti.");
                }
            }

            // Se não introduziu código válido ou deixou em branco, cria família Solo
            if (!finalFamilyId) {
                finalFamilyId = `fam_${newUid.slice(0, 8)}`;
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
                });
            }

            // Cria o documento do utilizador
            await setDoc(doc(db, 'users', newUid), {
                uid: newUid,
                nome: nomeFormatado,
                email: email.trim(),
                familyId: finalFamilyId,
                criadoEm: Date.now()
            });

            setLoading(false);
            return true;
        } catch (error) {
            setLoading(false);
            let msg = "Erro ao efetuar registo.";
            if (error.code === 'auth/email-already-in-use') msg = "Este e-mail já está em utilização.";
            if (error.code === 'auth/weak-password') msg = "A palavra-passe deve ter pelo menos 6 caracteres.";
            if (error.code === 'auth/invalid-email') msg = "E-mail inválido.";
            Alert.alert("Erro", msg);
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
            let msg = "E-mail ou palavra-passe incorretos.";
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') msg = "Credenciais inválidas.";
            Alert.alert("Erro", msg);
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

            // Verificar se o utilizador já pertence a esta família
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

            // Adiciona o novo membro na nova família
            await updateDoc(doc(db, 'familias', targetFamId), {
                membros: arrayUnion(novoMembro)
            });

            // Atualiza o familyId no perfil do utilizador
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

    // 8. REMOVER MEMBRO DA FAMÍLIA (ADMIN OU PRÓPRIO MEMBRO A SAIR)
    const removeMember = async (targetUid) => {
        if (!familyData) return;
        try {
            const membroARemover = familyData.membros.find(m => m.uid === targetUid);
            if (!membroARemover) return;

            // Remove o membro do documento da família atual
            const membrosRestantes = familyData.membros.filter(m => m.uid !== targetUid);
            await updateDoc(doc(db, 'familias', familyData.id), {
                membros: membrosRestantes
            });

            // Cria uma nova família solo para o membro removido
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
            });

            // Atualiza o familyId no perfil do utilizador removido
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
