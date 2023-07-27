export function mergeSort(array) {
  if (array.length < 2) {
    return array;
  }
  let middleIndex = Math.floor(array.length / 2);
  let leftElements = array.slice(0, middleIndex);
  let rightElements = array.slice(middleIndex);

  // return merge(mergeSort(leftElements), mergeSort(rightElements));
  return merge(mergeSort(leftElements), mergeSort(rightElements));
}

function merge(leftElements, rightElements) {
  let sorted = [];
  while (leftElements.length && rightElements.length) {
    if (leftElements[0] < rightElements[0]) {
      sorted.push(leftElements.shift());
    } else {
      sorted.push(rightElements.shift());
    }
  }
  return [...sorted, ...leftElements, ...rightElements];
}
