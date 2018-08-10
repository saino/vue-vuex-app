export const clamp = (number, lower, upper) => {
  // 都转为数值型
  number = +number
  lower = +lower
  upper = +upper
  // 排除lower、upper 为 NaN
  lower = lower === lower ? lower : 0
  upper = upper === upper ? upper : 0
  // 排除number 为 NaN
  if (number === number) {
    // 取出三个数值中中间值
    number = number <= upper ? number : upper
    number = number >= lower ? number : lower
  }
  return number
}
