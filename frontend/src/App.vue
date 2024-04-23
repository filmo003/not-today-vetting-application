<template>
  <div class="barcode_app" :class="[state]" @focus="ensureFocus()" tabindex="-1">
    <h1>{{ stateText }}</h1>
    <input ref="barcode_el" type="text" class="barcode_reader" @change="barcodeScanned" autofocus>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';

const barcode_el = ref(null);

const state = ref('UNSCANNED');

const stateText = computed(() => {
  if (state.value === 'APPROVED') return '✔ Approved';
  else if (state.value === 'DENIED') return '✗ Denied';

  return '(Scan a CAC)';
});

async function barcodeScanned() {

  const barcode_raw = barcode_el.value.value;
  barcode_el.value.value = "";
  const barcode = (barcode_raw.length === 18) ? {
    "version" : barcode_raw[0],
    "CSID" : parseInt(barcode_raw.slice(1,7), 32),
    "person_type" : barcode_raw[7],
    "DOD_ID" : parseInt(barcode_raw.slice(8,15), 32),
    "person_category" : barcode_raw[15],
    "branch" : barcode_raw[16],
    "card_id" : barcode_raw[17],
  } :
  {
    "version" : barcode_raw[0],
    "DOD_ID" : parseInt(barcode_raw.slice(1, 8), 32),
    "UNKNOWN" : barcode_raw.slice(8, 16),
    "first_name" : barcode_raw.slice(16, 36),
    "m_initial" : barcode_raw[36],
    "last_name" : barcode_raw.slice(37, 63),
    "UNKNOWN" : barcode_raw.slice(63, 93),
    "CSID" : parseInt(barcode_raw.slice(93, 99)),
  }


  console.log("DOD_ID", barcode.DOD_ID);

  // const res = await fetch('/api/can_i_has');
  const res = { ok: true }
  state.value = res.ok ? 'APPROVED' : 'DENIED';
  setTimeout(() => state.value = 'UNSCANNED', 1000);
}

function ensureFocus() {
  barcode_el.value.focus();
}

</script>

<style lang="scss">
body {
  padding: 0;
  margin: 0;
}

h1 {
  font-family: 'Montserrat';
  font-size: 2em;
  margin-left: .5em;
}

div.barcode_app {
  height: 100vh;
  width: 100vw;

  padding-top: 2em;

  &.UNSCANNED {
    background-color: #333;

    h1 {
      color: #aaa;
    }
  }

  &.APPROVED {
    background-color: #030;

    h1 {
      color: #2e0;
    }
  }

  &.DENIED {
    background-color: #300;

    h1 {
      color: #e02;
    }
  }

  transition: background-color 250ms linear;
  h1 {
    transition: color 250ms linear;
  }
}

</style>
