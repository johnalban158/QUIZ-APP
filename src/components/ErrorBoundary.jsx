import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Friendly crash fallback for the quiz-taking routes.
 *
 * A render crash in React unmounts the whole tree, leaving a blank white
 * page. This boundary catches those errors and shows a calm, elder-friendly
 * message with a single "Back to quizzes" action instead.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="main">
          <div className="card empty" role="alert">
            <span className="empty-icon">
              <AlertTriangle size={26} />
            </span>
            <h3>Something went wrong</h3>
            <p>We hit an unexpected problem while opening this activity. Please try again.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.assign('/quiz')}
            >
              Back to quizzes
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}