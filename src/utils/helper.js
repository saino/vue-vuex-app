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

export const durationFormat = seconds => {
  seconds = +seconds
  const hour = Math.floor(seconds / 3600) + ''
  const minute = Math.floor(seconds % 3600 / 60) + ''
  const second = Math.floor(seconds % 3600 % 60) + ''
  return `${hour.padStart(2, 0)}:${minute.padStart(2, 0)}:${second.padStart(2, 0)}`
}