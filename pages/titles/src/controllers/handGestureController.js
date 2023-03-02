import { prepareRunChecker } from "../../../../lib/shared/util.js"

const { shouldRun: scrollShouldRun } = prepareRunChecker({ timerDelay: 200 })
const { shouldRun: clickShouldRun } = prepareRunChecker({ timerDelay: 300 })

export default class HandGestureController {
  #view
  #service
  #camera
  #lastDirections = {
    direction: '',
    y: 0
  }

  constructor({ camera, view, service }) {
    this.#service = service
    this.#view = view
    this.#camera = camera
  }

  async init() {
    return this.#loop()
  }

  #scrollPage(direction) {
    const pixelPerScroll = 100
    if (this.#lastDirections.direction === direction) {
      this.#lastDirections.y = (
        direction === 'scroll-down' ? 
          this.#lastDirections.y + pixelPerScroll :
          this.#lastDirections.y - pixelPerScroll 
      )
    } else {
      this.#lastDirections.direction = direction
    }

    this.#view.scrollPage(this.#lastDirections.y)
  }

  async #estimateHands() {
    try {
      const hands = await this.#service.estimateHands(this.#camera.video)
      this.#view.clearCanvas()

      if (hands?.length > 0) this.#view.drawResults(hands)

      for await (const { event, x, y } of this.#service.detectGestures(hands)) {
        if (event === 'click') {
          if (!clickShouldRun()) continue;
          this.#view.clickOnElement(x, y)
          continue;
        }
        if (event.includes('scroll')) {
          if (!scrollShouldRun()) continue;
          this.#scrollPage(event)
        }
      }

    } catch (error) {
      console.error('deu ruim**', error)
    }
  }
  
  async #loop() {
    await this.#service.initializeDetector()
    await this.#estimateHands()
    this.#view.loop(this.#loop.bind(this))
  }

  static async initialize(deps) {
    const controller = new HandGestureController(deps)
    return controller.init()
  }
}