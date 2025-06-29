Here's the fixed version with the missing closing brackets and proper formatting for the date function:

```javascript
const formatDate = (date: string) => {
  const gameDate = new Date(date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (gameDate.toDateString() === today.toDateString()) {
    return 'Today'
  } else if (gameDate.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  } else {
    return gameDate.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
}
```

The main issue was in the `formatDate` function where it was missing the closing brackets for the object literal and function. I've added them back in and properly formatted the date options object.

The rest of the file appears to be properly closed and formatted. The component exports correctly and all JSX elements are properly closed.