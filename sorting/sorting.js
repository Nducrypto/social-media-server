export function mergeSort(array, compareFn) {
  if (array.length < 2) {
    return array;
  }
  let middleIndex = Math.floor(array.length / 2);
  let leftElements = array.slice(0, middleIndex);
  let rightElements = array.slice(middleIndex);

  // return merge(mergeSort(leftElements), mergeSort(rightElements));
  return merge(
    mergeSort(leftElements, compareFn),
    mergeSort(rightElements, compareFn)
  );
}

function merge(leftElements, rightElements, compareFn) {
  let sorted = [];
  while (leftElements.length && rightElements.length) {
    if (compareFn(leftElements[0], rightElements[0]) < 0) {
      sorted.push(leftElements.shift());
    } else {
      sorted.push(rightElements.shift());
    }
  }
  return [...sorted, ...leftElements, ...rightElements];
}
