import { useEffect } from "react";

interface Props {
  svg: string;
  mesaStatuses: Record<string, string>;
}

const getColor = (status?: string) => {
  switch (status) {
    case "done":
      return "#2ecc71";
    case "in_progress":
      return "#f1c40f";
    default:
      return "#bdc3c7";
  }
};

export default function PlantMap({ svg, mesaStatuses }: Props) {
  const normalizedSvg = svg
    .replace(/width="[^"]*"/, 'width="100%"')
    .replace(/height="[^"]*"/, 'height="100%"');
  useEffect(() => {
    if (!svg) return;
    Object.entries(mesaStatuses).forEach(([code, status]) => {
      const group = document.getElementById(code);
      if (!group) return;
      const color = getColor(status);
      group.style.fill = color;
    });
  }, [mesaStatuses, svg]);

  return (
    <div
      className="w-full h-full"
      dangerouslySetInnerHTML={{ __html: normalizedSvg }}
    />
  );
}
