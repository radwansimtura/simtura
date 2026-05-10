import { useEffect } from "react";

interface StructuredDataProps {
  schema: Record<string, unknown>;
  id: string;
}

export default function StructuredData({ schema, id }: StructuredDataProps) {
  useEffect(() => {
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      document.getElementById(id)?.remove();
    };
  }, [schema, id]);

  return null;
}
