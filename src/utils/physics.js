export default function buildTrajectoryFunction({ a, b, c }) {
    return function(x) {
        return b * x * x + a * x + c;
    };
}
