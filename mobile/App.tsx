import { useState } from "react";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import PlantSelectScreen from "./src/screens/PlantSelectScreen";
import PlantComponent from "./src/components/PlantDemoSVG";
import { ZoomableSVG } from "./src/components/ZoomableSVG";
import SessionScreen from "./src/screens/SessionScreen";

interface Plant {
  id: string;
  name: string;
  location: string;
  totalMesas: number;
}

export default function App() {
  // const [loggedIn, setLoggedIn] = useState(false);
  // const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  // if (!loggedIn) {
  //   return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  // }
  // if (!selectedPlant) {
  //   return (
  //     <PlantSelectScreen onSelectPlant={(plant) => setSelectedPlant(plant)} />
  //   );
  // }
  // return (
  //   <HomeScreen
  //     onLogout={() => {
  //       setLoggedIn(false);
  //       setSelectedPlant(null);
  //     }}
  //   />
  // );
  return <SessionScreen />;
}
