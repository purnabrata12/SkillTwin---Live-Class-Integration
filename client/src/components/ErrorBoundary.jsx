import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('SkillTwin UI error:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="center-page">
        <section className="status-card error-fallback">
          <div className="brand brand-large"><span className="brand-logo"><img src="/skilltwin-logo.jpeg" alt="SkillTwin logo" /></span><div><strong>SkillTwin</strong><small>Live Classroom</small></div></div>
          <h1>Something went wrong in the live-class screen.</h1>
          <p>{this.state.error?.message || 'Unexpected frontend error.'}</p>
          <button className="primary" onClick={()=>window.location.reload()}>Reload page</button>
        </section>
      </div>
    )
  }
}
