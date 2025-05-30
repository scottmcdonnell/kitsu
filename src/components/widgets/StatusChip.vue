<template>
  <div
    class="stat-chip"
    :class="{ 'has-tooltip': showTooltip }"
    :title="tooltipText"
  >
    <div
      class="chip-half first-take"
      :style="{
        'border-color': backgroundColor(1),
        'background-color': backgroundColor(0.9)
      }"
    >
      {{ formatValue(firstTake) }}
    </div>
    <div
      class="chip-half retake"
      :style="{
        'border-color': backgroundColor(1),
        'background-color': backgroundColor(0.3)
      }"
    >
      {{ formatValue(retake) }}
    </div>
  </div>
</template>

<script>
import { format } from 'date-fns'
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
      required: true
    },
    firstTake: {
      type: Number,
      required: true
    },
    retake: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      default: 's'
    },
    showTooltip: {
      type: Boolean,
      default: true
    }
  },

  computed: {
    ...mapGetters(['isDarkTheme']),
    shortUnit() {
      switch (this.unit) {
        case 'seconds':
        case 's':
          return 's'
        case 'frames':
        case 'f':
          return 'f'
        default:
          return ''
      }
    },

    tooltipText() {
      const formattedDate = format(new Date(this.date), 'yyyy-MM-dd')
      const firstTake = this.formatValue(this.firstTake)
      const retake = this.formatValue(this.retake)
      return `[${this.status.name}] - ${formattedDate}\nFirst takes: ${firstTake}${this.shortUnit}\nRetakes: ${retake}${this.shortUnit}`
    }
  },
  methods: {
    formatValue(value) {
      const unit = this.shortUnit
      return unit === 's' ? value.toFixed(2) : value.toFixed(0)
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

    &.first-take {
      border-radius: 1rem 0 0 1rem;
      border-right: none;
    }

    &.retake {
      border-radius: 0 1rem 1rem 0;
      border-left: none;
    }
  }
}
</style>
