import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { db } from '@/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginScreen() {
  // Asegura que Firebase se haya inicializado al importar firebaseConfig (db no se usa aquí)
  const router = useRouter();
  const auth = getAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(''); // solo para registro
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countryDisplay, setCountryDisplay] = useState('');
  const [countryApi, setCountryApi] = useState('');
  const [stateProv, setStateProv] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [statesLoading, setStatesLoading] = useState(false);
  const [statesError, setStatesError] = useState<string | null>(null);
  const statesCache = React.useRef<Record<string, string[]>>({}).current;
  const citiesCache = React.useRef<Record<string, string[]>>({}).current;
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [cityOpen, setCityOpen] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState<string | null>(null);
  const [sex, setSex] = useState('');
  const [sexOpen, setSexOpen] = useState(false);
  const sexOptions = ['Masculino', 'Femenino', 'Otros'];

  const latamCountries = [
    { display: 'Argentina', api: 'Argentina' },
    { display: 'Bolivia', api: 'Bolivia' },
    { display: 'Brasil', api: 'Brazil' },
    { display: 'Chile', api: 'Chile' },
    { display: 'Colombia', api: 'Colombia' },
    { display: 'Costa Rica', api: 'Costa Rica' },
    { display: 'Cuba', api: 'Cuba' },
    { display: 'República Dominicana', api: 'Dominican Republic' },
    { display: 'Ecuador', api: 'Ecuador' },
    { display: 'El Salvador', api: 'El Salvador' },
    { display: 'Guatemala', api: 'Guatemala' },
    { display: 'Honduras', api: 'Honduras' },
    { display: 'México', api: 'Mexico' },
    { display: 'Nicaragua', api: 'Nicaragua' },
    { display: 'Panamá', api: 'Panama' },
    { display: 'Paraguay', api: 'Paraguay' },
    { display: 'Perú', api: 'Peru' },
    { display: 'Uruguay', api: 'Uruguay' },
    { display: 'Venezuela', api: 'Venezuela' },
    { display: 'Puerto Rico', api: 'Puerto Rico' },
  ];

  const loadStatesForCountry = async (apiName: string) => {
    if (!apiName) return;
    if (statesCache[apiName]) return; // cached
    setStatesLoading(true);
    setStatesError(null);
    try {
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: apiName }),
      });
      const json = await res.json();
      const states: string[] = (json?.data?.states || []).map((s: any) => s.name).filter(Boolean);
      statesCache[apiName] = states;
    } catch (e: any) {
      console.warn('No se pudieron cargar estados para', apiName, e?.message || e);
      setStatesError('No se pudieron cargar los estados.');
    } finally {
      setStatesLoading(false);
    }
  };

  const loadCitiesForState = async (apiName: string, stateName: string) => {
    if (!apiName || !stateName) return;
    const key = `${apiName}__${stateName}`;
    if (citiesCache[key]) return;
    setCitiesLoading(true);
    setCitiesError(null);
    try {
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: apiName, state: stateName }),
      });
      const json = await res.json();
      const arr = (json?.data?.cities || json?.data || []).filter((x: any) => typeof x === 'string');
      citiesCache[key] = arr;
    } catch (e: any) {
      console.warn('No se pudieron cargar ciudades para', apiName, stateName, e?.message || e);
      setCitiesError('No se pudieron cargar las ciudades.');
    } finally {
      setCitiesLoading(false);
    }
  };

  const validate = () => {
    if (!email.trim()) {
      Alert.alert('Validación', 'Ingrese un correo electrónico.');
      return false;
    }
    if (!password || password.length < 6) {
      Alert.alert('Validación', 'La contraseña debe tener al menos 6 caracteres.');
      return false;
    }
    if (isRegister) {
      if (!displayName.trim()) {
        Alert.alert('Validación', 'Ingrese su nombre.');
        return false;
      }
      if (!countryDisplay) {
        Alert.alert('Validación', 'Seleccione su país.');
        return false;
      }
      if (!stateProv) {
        Alert.alert('Validación', 'Seleccione su departamento/estado.');
        return false;
      }
      if (!city.trim()) {
        Alert.alert('Validación', 'Seleccione su ciudad.');
        return false;
      }
      if (!username.trim()) {
        Alert.alert('Validación', 'Ingrese su nombre de usuario.');
        return false;
      }
      if (!sex) {
        Alert.alert('Validación', 'Seleccione su sexo.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName.trim()) {
          try { await updateProfile(cred.user, { displayName: displayName.trim() }); } catch {}
        }
        // Guardar perfil básico con país y estado
        try {
          await setDoc(doc(db, 'Users', cred.user.uid), {
            displayName: displayName.trim() || null,
            email: email.trim(),
            country: countryDisplay,
            countryApi,
            city: city.trim(),
            state: stateProv,
            username: username.trim(),
            sex,
            createdAt: serverTimestamp(),
          });
        } catch (e) {
          console.warn('No se pudo guardar el perfil del usuario:', e);
        }
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      // Redirigir al home (index dentro de (tabs))
      router.replace('/(tabs)');
    } catch (e: any) {
      const msg = e?.message || 'Error desconocido';
      setError(msg);
      Alert.alert('Error de autenticación', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</Text>

      {isRegister ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Nombre completo"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            secureTextEntry
          />

          {/* Selector de País */}
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>País</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => { setCountryOpen((o) => !o); setStateOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownText}>
                {countryDisplay || 'Selecciona tu país'}
              </Text>
            </TouchableOpacity>
            {countryOpen && (
              <View style={styles.dropdownList}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {latamCountries.map((c) => (
                    <TouchableOpacity
                      key={c.api}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCountryDisplay(c.display);
                        setCountryApi(c.api);
                        setStateProv('');
                        setCountryOpen(false);
                        // precargar estados
                        loadStatesForCountry(c.api);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{c.display}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Selector de Departamento/Estado */}
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>Departamento / Estado</Text>
            <TouchableOpacity
              style={[styles.dropdown, !countryApi && styles.dropdownDisabled]}
              onPress={async () => {
                if (!countryApi) return;
                if (!statesCache[countryApi]) await loadStatesForCountry(countryApi);
                setStateOpen((o) => !o);
                setCountryOpen(false);
              }}
              activeOpacity={0.7}
              disabled={!countryApi}
            >
              <Text style={styles.dropdownText}>
                {stateProv || (countryApi ? 'Selecciona tu departamento/estado' : 'Selecciona primero un país')}
              </Text>
            </TouchableOpacity>
            {stateOpen && countryApi && (
              <View style={styles.dropdownList}>
                {statesLoading ? (
                  <View style={styles.dropdownItem}><Text style={styles.dropdownItemText}>Cargando...</Text></View>
                ) : statesError ? (
                  <View style={styles.dropdownItem}><Text style={styles.dropdownItemText}>{statesError}</Text></View>
                ) : (
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {(statesCache[countryApi] || []).map((s) => (
                      <TouchableOpacity
                        key={s}
                        style={styles.dropdownItem}
                        onPress={async () => {
                          setStateProv(s);
                          setCity('');
                          setStateOpen(false);
                          await loadCitiesForState(countryApi, s);
                        }}
                      >
                        <Text style={styles.dropdownItemText}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          {/* Ciudad (desplegable) */}
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>Ciudad</Text>
            <TouchableOpacity
              style={[styles.dropdown, (!countryApi || !stateProv) && styles.dropdownDisabled]}
              onPress={async () => {
                if (!countryApi || !stateProv) return;
                const key = `${countryApi}__${stateProv}`;
                if (!citiesCache[key]) await loadCitiesForState(countryApi, stateProv);
                setCityOpen((o) => !o);
                setCountryOpen(false);
                setStateOpen(false);
              }}
              activeOpacity={0.7}
              disabled={!countryApi || !stateProv}
            >
              <Text style={styles.dropdownText}>
                {city || (stateProv ? 'Selecciona tu ciudad' : 'Selecciona primero un departamento/estado')}
              </Text>
            </TouchableOpacity>
            {cityOpen && stateProv && (
              <View style={styles.dropdownList}>
                {citiesLoading ? (
                  <View style={styles.dropdownItem}><Text style={styles.dropdownItemText}>Cargando...</Text></View>
                ) : citiesError ? (
                  <View style={styles.dropdownItem}><Text style={styles.dropdownItemText}>{citiesError}</Text></View>
                ) : (
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {(citiesCache[`${countryApi}__${stateProv}`] || []).map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={styles.dropdownItem}
                        onPress={() => { setCity(c); setCityOpen(false); }}
                      >
                        <Text style={styles.dropdownItemText}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>

          {/* Selector de Sexo */}
          <View style={styles.dropdownContainer}>
            <Text style={styles.dropdownLabel}>Sexo</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => { setSexOpen((o) => !o); setCountryOpen(false); setStateOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownText}>
                {sex || 'Selecciona tu sexo'}
              </Text>
            </TouchableOpacity>
            {sexOpen && (
              <View style={styles.dropdownList}>
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {sexOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={styles.dropdownItem}
                      onPress={() => { setSex(opt); setSexOpen(false); }}
                    >
                      <Text style={styles.dropdownItemText}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            secureTextEntry
          />
        </>
      )}

      <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>{isRegister ? 'Registrar' : 'Ingresar'}</Text>
        )}
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity onPress={() => setIsRegister((v) => !v)} style={styles.switchMode}>
        <Text style={styles.switchModeText}>
          {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  switchMode: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  errorText: {
    marginTop: 10,
    color: '#c20000',
    textAlign: 'center',
  },
  dropdownContainer: {
    marginBottom: 12,
  },
  dropdownLabel: {
    marginBottom: 6,
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dropdownDisabled: {
    opacity: 0.6,
  },
  dropdownText: {
    color: '#333',
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    color: '#333',
  },
});
