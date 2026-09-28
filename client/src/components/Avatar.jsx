import { UserRound } from 'lucide-react'

export default function Avatar({ photo, name, size = 'normal' }) {
  if (photo) {
    return <img className={`avatar avatar-${size}`} src={photo} alt={name || 'Participant'} />
  }
  return (
    <div className={`avatar avatar-${size}`} aria-label={name || 'Participant'}>
      <UserRound />
    </div>
  )
}
