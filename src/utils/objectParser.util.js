export default function objectParser(object) {
  for (let key in object) {
    if (typeof object[key] === "object" && object[key] !== null) {
      object[key] = objectParser(object[key]);
    } else if (typeof object[key] === "string") {
      try {
        object[key] = JSON.parse(object[key]);
      } catch (e) {}
    }
  }
  return object;
}
