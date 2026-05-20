import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import PlantSelectScreen from "./src/screens/PlantSelectScreen";
import SessionScreen from "./src/screens/SessionScreen";
import SessionSummaryScreen from "./src/screens/SessionSummaryScreen";

export type RootStackParamList = {
  Login: undefined;
  PlantSelect: undefined;
  Home: undefined;
  Session: undefined;
  SessionSummary: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="PlantSelect" component={PlantSelectScreen} />
        <Stack.Screen name="Session" component={SessionScreen} />
        <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
