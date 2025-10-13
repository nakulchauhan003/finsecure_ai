import { GradientTracing } from "./gradient-tracing";

const Demo = () => (
  <GradientTracing
    width={150}
    height={100}
    path="M50,50 C50,25 75,25 100,50 S150,75 150,50 S125,25 100,50 C75,75 50,75 50,50 M150,50 C150,25 175,25 200,50 S250,75 250,50 S225,25 200,50 C175,75 150,75 150,50"
    gradientColors={["#9B59B6", "#9B59B6", "#3498DB"]}
  />
);

export { Demo };