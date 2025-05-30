<template>
  <div>
    <label class="label" v-if="label">
      {{ label }}
    </label>
    <multiselect
      ref="multiselect"
      label="short_name"
      :allow-empty="clearable"
      :disabled="disabled"
      :options="items"
      :multiple="multiple"
      :placeholder="placeholder || $t('people.select_person')"
      :show-labels="false"
      :show-no-options="false"
      :show-no-results="false"
      track-by="name"
      @remove="onSelect"
      @select="onSelect"
      v-model="selected"
    >
      <template #option="props">
        <span
          class="tag"
          :style="{
            background: backgroundColor(props.option),
            color: color(props.option)
          }"
        >
          {{ props.option.short_name }}
        </span>
      </template>

      <template #tag="{ option, remove }">
        <span
          class="multiselect__tag"
          :style="{
            background: backgroundColor(option),
            color: color(option)
          }"
        >
          <span class="multiselect__tag-text">{{
            option ? option.short_name : ''
          }}</span>
          <i
            tabindex="1"
            class="multiselect__tag-icon"
            @click="remove(option)"
          ></i>
        </span>
      </template>
      <template #noResult>
        <span></span>
      </template>

      <template #singleLabel="props">
        <span
          class="tag"
          :style="{
            background: backgroundColor(props.option),
            color: color(props.option)
          }"
        >
          {{ props.option.short_name }}
        </span>
      </template>
    </multiselect>
  </div>
</template>

<script>
import colors from '@/lib/colors'
import { sortTaskStatuses } from '@/lib/sorting'

import { mapGetters } from 'vuex'
import Multiselect from 'vue-multiselect'
import 'vue-multiselect/dist/vue-multiselect.min.css'

export default {
  name: 'combobox-statuses',

  components: {
    Multiselect
  },

  emits: ['select', 'update:modelValue'],

  data() {
    return {
      selected: [],
      search: ''
    }
  },

  props: {
    clearable: {
      type: Boolean,
      default: true
    },
    disabled: {
      type: Boolean,
      default: false
    },
    label: {
      default: '',
      type: String
    },
    productionId: {
      default: null,
      type: String
    },
    statuses: {
      default: () => [],
      type: Array
    },
    modelValue: {
      default: () => [],
      type: Array
    },
    multiple: {
      default: true,
      type: Boolean
    },
    placeholder: {
      default: 'Select status',
      type: String
    },
    small: {
      type: Boolean,
      default: false
    },
    wide: {
      type: Boolean,
      default: false
    }
  },

  computed: {
    ...mapGetters(['isDarkTheme', 'productionMap', 'taskStatusMap']),
    items() {
      console.log('items', this.statuses)
      // if productionId is set, filter statuses by production
      if (this.productionId) {
        const production = this.productionMap.get(this.productionId)
        return sortTaskStatuses(this.statuses, production)
      } else {
        return this.statuses
      }
    }
  },

  watch: {
    modelValue() {
      let status_ids = []
      if (this.modelValue && typeof this.modelValue === 'object') {
        status_ids = this.modelValue
      }
      // convert from ids to status objects and filter out any missing
      this.selected = status_ids
        .map(id => this.taskStatusMap.get(id))
        .filter(status => status)
    }
  },

  methods: {
    onSelect() {
      const status_ids = this.selected
        ? this.selected.map(status => status.id)
        : []
      this.$emit('update:modelValue', status_ids)
      this.$emit('select', status_ids)
    },

    focus() {
      this.$refs.multiselect.$el.focus()
    },

    /**
     * same color function as the ComboboxStatus.vue
     */
    backgroundColor(taskStatus) {
      if ((!taskStatus || taskStatus.name === 'Todo') && !this.isDarkTheme) {
        return '#ECECEC'
      } else if (
        (!taskStatus || taskStatus.name === 'Todo') &&
        this.isDarkTheme
      ) {
        return '#5F626A'
      } else if (this.isDarkTheme) {
        return colors.darkenColor(taskStatus.color)
      } else {
        return taskStatus.color
      }
    },
    color(taskStatus) {
      return colors.validationTextColor(taskStatus)
    }
  }
}
</script>

<style lang="scss" scoped>
.multiselect {
  min-height: 40px;
}

.multiselect__tag-icon::after {
  content: 'x';
  color: #000;
  opacity: 0.4;
}

.multiselect__tag-icon:hover::after {
  opacity: 1;
  color: #fff;
}

.multiselect__tag > .multiselect__tag-text {
  text-transform: uppercase;
  font-size: 0.9em;
}

.tag {
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  font-size: 0.9em;
}
</style>
