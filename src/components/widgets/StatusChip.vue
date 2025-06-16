<template>
  <div
    class="stat-chip"
    :class="{ 'has-tooltip': showTooltip }"
    :title="tooltipText"
  >
    <div
      class="chip-half initial"
      :style="{
        'border-color': backgroundColor(1),
        'background-color': backgroundColor(0.9)
      }"
    >
      {{ formatValue(initial) }}
    </div>
    <div
      class="chip-half repeat"
      :style="{
        'border-color': backgroundColor(1),
        'background-color': backgroundColor(0.3)
      }"
    >
      {{ formatValue(repeat) }}
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import colors from '@/lib/colors'

export default {
  name: 'status-stat-chip',

  props: {
    status: {
      type: Object,
      required: true
    },
    date: {
      type: String,
      default: ''
    },
    initial: {
      type: Object,
      required: true
    },
    repeat: {
      type: Object,
      required: true
    },
    countMode: {
      type: String,
      default: 'count'
    },
    showTooltip: {
      type: Boolean,
      default: true
    }
  },

  computed: {
    ...mapGetters(['isDarkTheme']),
    unit() {
      switch (this.countMode) {
        case 'seconds':
        case 'nb_seconds':
          return 's'
        case 'frames':
        case 'nb_frames':
          return 'f'
        default:
          return ''
      }
    },

    tooltipText() {
      const date = this.date ? ` - ${this.date}` : ''
      const initial = this.formatValue(this.initial)
      const repeat = this.formatValue(this.repeat)
      return `[${this.status.name.toUpperCase()}]${date}\nInitial: ${initial} ${this.unit}\nRepeat: ${repeat} ${this.unit}`
    }
  },
  methods: {
    formatValue(valueObj) {
      const value = this.countMode in valueObj ? valueObj[this.countMode] : 0
      return this.countMode === 'nb_seconds'
        ? this.roundValue(value, 100)
        : this.roundValue(value)
    },
    roundValue(value, precision = 1) {
      return Math.round((value + Number.EPSILON) * precision) / precision
    },

    backgroundColor(opacity) {
      const status = this.status
      if ((!status || status.name === 'Todo') && !this.isDarkTheme) {
        return colors.hexToRGBa('#ECECEC', opacity)
      } else if ((!status || status.name === 'Todo') && this.isDarkTheme) {
        return colors.hexToRGBa('#5F626A', opacity)
      } else if (this.isDarkTheme) {
        return colors.darkenColor(status.color).alpha(opacity)
      } else {
        return colors.hexToRGBa(status.color, opacity)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.stat-chip {
  display: inline-flex;
  border-radius: 1rem;
  overflow: hidden;
  font-size: 0.8rem;
  height: 1.5rem;
  line-height: 1.5rem;
  color: #fff;

  &.has-tooltip {
    cursor: help;
  }

  .chip-half {
    padding: 0 0.5rem;
    border: 1px solid;

    &.initial {
      border-radius: 1rem 0 0 1rem;
      border-right: none;
    }

    &.repeat {
      border-radius: 0 1rem 1rem 0;
      border-left: none;
    }
  }
}
</style>
