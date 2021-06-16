'use strict';

async function chooseImage() {
  fillCache()
  const cache = Options().cache
  await cache.ensureRead()
  let image = cache.pop()

  if (! image) image = await PhotoChooser().pick()
  if (! image) return

  const history = Options().history_manager
  await history.ensureRead()
  history.increment(image)

  setImage(image.url)
  showInfo(image)
}

async function fillCache() {
  const cache = Options().cache
  await cache.ensureRead()

  const cache_depletion = cache.depth - cache.count
  if (cache_depletion > 0) console.log(`Cache is depleted by ${cache_depletion}`)

  for (let i = cache_depletion; i > 0; i --) {
    let item = await PhotoChooser().pick()

    if (! item) continue

    let img = Builder.img(item.url)
    console.log(`Fetching ${item.url}`)

    document.querySelector('prefetch').appendChild(img)

    img.onload = () => {
      console.log(`Finished caching ${item.url}`)
      cache.push(item)
    }
  }
}

function setImage(url) {
  document.querySelector('background').style.setProperty("background-image", `url(${url})`)
}

function showInfo(item) {
  let title = (item.content_text || "untitled")

  if (title.length > 50) {
    let first_fifty = title.substring(0,50)
    let a_space = first_fifty.lastIndexOf(' ')

    if (a_space < 0)
      a_space = 50

    title = title.substring(0, a_space) + "..."
  }

  document.querySelector('info name').appendChild(
    Builder.link(item.external_url, title)
  )
  document.querySelector('info by-line').appendChild(
    Builder.link(item.author.url, `by ${item.author.name}`)
  )
  document.querySelector('info venue').appendChild(
    Builder.link(item._meta.venue.url, `on ${item._meta.venue.name}`)
  )

  if (item._meta.camera_settings) {
    if (item._meta.camera_settings.f)
      document.querySelector('info camera').appendChild(
        Builder.tag('aperture', item._meta.camera_settings.f)
      )

    if (item._meta.camera_settings.iso)
      document.querySelector('info camera').appendChild(
        Builder.tag('iso', item._meta.camera_settings.iso)
      )

    if (item._meta.camera_settings.shutter_speed)
      document.querySelector('info camera').appendChild(
        Builder.tag('shutter', item._meta.camera_settings.shutter_speed)
      )
  }

  if (item._meta.camera) {
    if (item._meta.camera.aperture)
      document.querySelector('info camera').appendChild(
        Builder.tag('aperture', `ƒ/${item._meta.camera.aperture}`)
      )

    if (item._meta.camera.iso)
      document.querySelector('info camera').appendChild(
        Builder.tag('iso', `ISO ${item._meta.camera.iso}`)
      )

    if (item._meta.camera.shutter_speed)
      document.querySelector('info camera').appendChild(
        Builder.tag('shutter', `${item._meta.camera.shutter_speed}s`)
      )
  }
}

function info_box_toggly(){
  if (display_options.show_info) {
    document.querySelector('info').style.display = ""
  } else {
    document.querySelector('info').style.display = "none"
  }
}

function tick() {
  set_bezel_persistence()
  update_clock()
  info_box_toggly()
}

async function set_bezel_persistence(){
  document.querySelector('sidebar').classList.remove('subtle', 'aggressive', 'demanding')
  document.querySelector('sidebar').classList.add(display_options.info_persistence.toLowerCase())
}


async function update_clock(){
  const now = new Date()
  updateTime(now)
  updateDate(now)

  if (display_options.show_clock) {
    document.querySelector('time').style.display = ""
  } else {
    document.querySelector('time').style.display = "none"
  }

  if (display_options.show_date) {
    document.querySelector('date').style.display = ""
  } else {
    document.querySelector('date').style.display = "none"
  }

  if (display_options.show_clock && display_options.show_date) {
    document.querySelector('clock').classList.add('top_border')
  } else {
    document.querySelector('clock').classList.remove('top_border')
  }

  if (display_options.show_clock || display_options.show_date) {
    document.querySelector('clock').style.display = ""
  } else {
    document.querySelector('clock').style.display = "none"
  }
}

function updateTime(now) {
  let time = ""
  const sep = ":"

  if (display_options.clock_flash && now.getSeconds() % 2 == 0)
    sep = " "

  let hour = now.getHours()
  if (display_options.twentyfour_hour_clock) {
    if (hour < 10) hour = "0" + hour
  } else {
    if (hour > 12) hour -= 12
  }
  time += hour
  time += sep

  let minute = now.getMinutes()
  if (minute < 10) minute = "0" + minute
  time += minute

  if (display_options.show_seconds) {
    let second = now.getSeconds()
    if (second < 10) second = "0" + second
    time += sep
    time += second
  }

  document.querySelector('time').textContent = time
}

function updateDate(now) {
  let date = ""

  if (display_options.date_format == "good") {
    date = terse_date(now)
  } else {
    date = verbose_date(now)
  }

  document.querySelector('date').textContent = date
}

const display_options = Options().display
let option_read_timeout = 0

async function readOptions() {
  await display_options.read()
}

browser.storage.onChanged.addListener((changes, area) => {
  clearTimeout(option_read_timeout)
  option_read_timeout = setTimeout(() => {readOptions()}, 10)
})

document.addEventListener('DOMContentLoaded', (event) => {
  document.querySelector('version').textContent = Version.number

  chooseImage()
  setInterval(tick, 100)
  PhotoChooser().prune()
});
