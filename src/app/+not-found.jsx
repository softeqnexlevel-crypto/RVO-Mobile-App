import { View, Text, StyleSheet } from "react-native";
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
    return (
        <>
            <Stack.Screen options={{ title: "Not Found" }} />
            <View style={styles.container}>
                <Link style={styles.button} href="/">
                    Go back to home screen
                </Link>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    button: {
        fontSize: 16,
        textDecorationLine: 'underline',
        color: '#007AFF',
    },
});