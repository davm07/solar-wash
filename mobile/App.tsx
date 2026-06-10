import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import LoginScreen from "./src/screens/LoginScreen";
import PlantSelectScreen from "./src/screens/PlantSelectScreen";
import PlantDetailScreen from "./src/screens/PlantDetailScreen";
import SessionScreen from "./src/screens/SessionScreen";
import SessionSummaryScreen from "./src/screens/SessionSummaryScreen";
import CycleDetailScreen from "./src/screens/CycleDetailScreen";

export type RootStackParamList = {
  Login: undefined;
  PlantSelect: undefined;
  PlantDetail: undefined;
  Session: undefined;
  SessionSummary: { sessionId: string };
  CycleDetail: { cycleId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="PlantSelect" component={PlantSelectScreen} />
          <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
          <Stack.Screen name="Session" component={SessionScreen} />
          <Stack.Screen name="SessionSummary" component={SessionSummaryScreen} />
          <Stack.Screen name="CycleDetail" component={CycleDetailScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
