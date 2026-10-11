export function capitalize(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1)
}

export function pluralize(count: number, word: string): string {
  return `${count} ${count === 1 ? word : `${word}s`}`
}
