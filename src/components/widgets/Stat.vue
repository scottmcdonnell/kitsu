<template>
  <div
    class="stat-widget"
    :class="{ clickable: !!link }"
    @click="handleClick"
    v-tooltip="tooltip"
  >
    <div class="stat-header">
      <span class="stat-label" v-if="label">{{ label }}</span>
      <div class="stat-trend" v-if="arrow">
        <span
          class="trend-arrow"
          :class="{
            'trend-up': arrow === 'up',
            'trend-down': arrow === 'down'
          }"
        >
          {{ arrow === 'up' ? '↑' : '↓' }}
        </span>
      </div>
    </div>

    <div class="stat-content">
      <div class="stat-number-container">
        <span class="stat-number">{{ formatNumber(number) }}</span>
        <span class="stat-unit" v-if="unit">{{ unit }}</span>
      </div>
      <p class="stat-description" v-if="description">{{ description }}</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'stat-widget',

  props: {
    label: {
      type: String,
      default: ''
    },
    number: {
      type: [Number, String],
      required: true
    },
    unit: {
      type: String,
      default: ''
    },
    description: {
      type: String,
      default: ''
    },
    tooltip: {
      type: String,
      default: ''
    },
    link: {
      type: [String, Object],
      default: null
    },
    arrow: {
      type: String,
      validator: value => ['up', 'down', null].includes(value),
      default: null
    }
  },

  methods: {
    handleClick() {
      if (this.link) {
        if (typeof this.link === 'string') {
          this.$router.push(this.link)
        } else {
          this.$router.push(this.link)
        }
      }
    },

    formatNumber(value) {
      // Handle large numbers with K/M/B suffix
      if (typeof value === 'number') {
        if (value >= 1000000000) {
          return (value / 1000000000).toFixed(1) + 'B'
        }
        if (value >= 1000000) {
          return (value / 1000000).toFixed(1) + 'M'
        }
        if (value >= 1000) {
          return (value / 1000).toFixed(1) + 'K'
        }
      }
      return value
    }
  }
}
</script>

<style lang="scss" scoped>
.stat-widget {
  background: var(--background-panel);
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.2s ease;
  height: 100%;

  &.clickable {
    cursor: pointer;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: $grey;
  font-size: 0.875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-trend {
  display: flex;
  align-items: center;

  .trend-arrow {
    font-size: 1.25rem;
    font-weight: bold;

    &.trend-up {
      color: var(--green);
    }

    &.trend-down {
      color: var(--red);
    }
  }
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-number-container {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
}

.stat-number {
  font-size: 2rem;
  font-weight: 600;
  line-height: 1;
  color: var(--text);
}

.stat-unit {
  color: $grey;
  font-size: 1rem;
  font-weight: 500;
}

.stat-description {
  color: $grey;
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.4;
}

// Dark theme support
.dark {
  .stat-widget {
    background: var(--background-panel-dark);
  }
}
</style>
