import firebase from 'firebase/compat/app'

if (!process.env.FIREBASE_CONFIG) {
    // eslint-disable-next-line no-console
    console.error('The environment variable FIREBASE_CONFIG is missing!')
} else {
    const app = firebase.initializeApp(JSON.parse(process.env.FIREBASE_CONFIG))
    if (process.env.FIREBASE_ENV === 'local') {
        app.functions().useEmulator('localhost', 5001)
        app.auth().useEmulator('http://localhost:9099')
        app.firestore().useEmulator('localhost', 8080)
        app.storage().useEmulator('localhost', 9199)
    }
}
