<template>
  <div class="barcode_app" :class="[state]">
    <h1>Scan a Barcode</h1>
    <input ref="barcode_el" type="text" class="barcode_reader" @change="barcodeScanned" autofocus>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';

const barcode_el = ref(null);

const state = ref('UNSCANNED');

function barcodeScanned() {

  const barcode_raw = barcode_el.value.value;
  const barcode = (barcode_raw.length === 18) ? {
    "version" : barcode_raw[0],
    "CSI" : parseInt(barcode_raw.slice(1,7), 32),
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
    "CSID" : parseInt(barcode_raw.slice(93, 98)),
    "UNKNOWN" : barcode_raw[98],
  }


  console.log("DOD_ID", barcode.DOD_ID);

  state.value = "SUCCESS";
  setTimeout(() => state.value = "UNSCANNED", 1000);

  barcode_el.value.value = "";
}

</script>

<style lang="scss">
body {
  padding: 0;
  margin: 0;
}

h1 {
  font-family: 'Montserrat';
  text-align: center;
}

div.barcode_app {
  height: 100vh;
  width: 100vw;

  padding-top: 2em;

  display: flex;
  flex-direction: column;
  justify-content: center;

  &.UNSCANNED {
    background-color: #333;

    h1 {
      color: #aaa;
    }
  }

  &.SUCCESS {
    background-color: #030;

    h1 {
      color: #2e0;
    }
  }

  transition: background-color 250ms linear;
  h1 {
    transition: color 250ms linear;
  }
}

input.barcode_reader {
  width: 100%;
  height: 3em;
}
</style>