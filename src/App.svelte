<script lang="ts">
  import { onMount } from "svelte";
  import { blur, fade } from "svelte/transition";

  import { TezosToolkit } from "@taquito/taquito";
  import { BeaconWallet } from "@taquito/beacon-wallet";
  import { sound } from "svelte-sound";
  import vibeSound from "./assets/vibe.wav";

  const collectionAddress = "KT1MNbfFFqNqDXXdNJ3aUoiiHWazueLArVWB";
  const placeholderId = 12;
  const ipfsGatewayPrefix = "https://ipfs.io/ipfs/";
  const linkToNftPrefix = "https://objkt.com/asset/";
  const linkToCollectionPrefix = "https://objkt.com/collection/";
  const objktcomGraphqlEndpoint = "https://data.objkt.com/v3/graphql";
  const rpcUrl = "https://mainnet.api.tez.ie";

  const Tezos = new TezosToolkit(rpcUrl);
  let wallet: BeaconWallet;

  let title = "";
  let linkToNft = "";
  let linkToCollection = "";
  let imageSrc = "placeholder.jpg";
  let queryResponse: any;

  let connected = false;
  let detected = false;
  let failed = false;
  let revealed = false;

  onMount(async () => {
    const walletOptions = { name: "Your Visiblr Portrait Reveal" };
    wallet = new BeaconWallet(walletOptions);
  });

  async function check() {
    const address = await getWalletAddress(wallet);
    const result = await checkDoesWalletHaveATokenFromCollection(
      address,
      collectionAddress,
      1
    );
    // shortcut if first conditon is true
    detected = (isTokenPresent(result) && (isTokenUnique(result) || detectAndRemovePlaceholder(result)));
    failed = !detected;
  }

  async function checkDoesWalletHaveATokenFromCollection(
    wallet: string,
    collection: string,
    amount = 1
  ) {
    const query = `
      query MyQuery {
        token_holder(
          where: {_and: {holder_address: {_eq: "${wallet}"}, token: {fa_contract: {_eq: "${collection}"}}, quantity: {_eq: "${amount}"}}}
        ) {
          quantity
          token {
            fa_contract
            token_id
            thumbnail_uri
            artifact_uri
            display_uri
            name
          }
        }
      }
    `;
    queryResponse = queryResponse = await doFetch(query);
    return queryResponse;
  }

  async function connect() {
    await wallet.requestPermissions();
    Tezos.setWalletProvider(wallet);
    connected = true;
  }

  function constructIpfsGatewayImageUrl(response: any) {
    const ipfs = response["token_holder"][0]["token"]["display_uri"];
    const ipfsAddress = ipfs.replace(/^ipfs?\:\/\//i, "");
    const ipfsUrl = `${ipfsGatewayPrefix}${ipfsAddress}`;
    return ipfsUrl;
  }

  function constructLinkToNft(response: any) {
    const id = response["token_holder"][0]["token"]["token_id"];
    return `${linkToNftPrefix}${collectionAddress}/${id}`; // collectionAddress alternatively from response
  }

  function constructLinkToCollection(response: any) {
    return `${linkToCollectionPrefix}${collectionAddress}`; // collectionAddress alternatively from response
  }

  function constructTitle(response: any) {
    const name = response["token_holder"][0]["token"]["name"];
    return name;
  }

  async function disconnect() {
    await wallet.client.clearActiveAccount();
    connected = false;
  }

  async function doFetch(query: string) {
    const { errors, data } = await fetchGraphQL(query, "MyQuery", {});
    if (errors) {
      console.error(errors);
      return errors;
    } else {
      console.log(data);
      return data;
    }
  }

  async function fetchGraphQL(
    query: string,
    operationName: string,
    variables: any
  ) {
    const result = await fetch(objktcomGraphqlEndpoint, {
      method: "POST",
      body: JSON.stringify({
        query: query,
        variables: variables,
        operationName: operationName,
      }),
    });

    return await result.json();
  }

  async function getWalletAddress(wallet: BeaconWallet) {
    const address = await wallet.getPKH();
    return address;
  }

  function detectAndRemovePlaceholder(response: any) {
    if (response["token_holder"].length != 2) {
      console.log("Result: too many or too few tokens detected");
      console.log(response);
      return false;
    } else if (response["token_holder"][0]["token"]["token_id"] != placeholderId && response["token_holder"][1]["token"]["token_id"] != placeholderId) {
    	console.log("Result: Placeholder not detected");
      console.log(response);
      return false;
    } else {
      // removing the placeholder from the query response
      console.log(queryResponse["token_holder"])
      if (response["token_holder"][0]["token"]["token_id"] == placeholderId) {
        queryResponse["token_holder"].shift(); 
      } else if (response["token_holder"][1]["token"]["token_id"] == placeholderId) {
        queryResponse["token_holder"].pop(); 
      }
		return true;
	}
  }

  function isTokenPresent(response: any) {
    if (
      response == null ||
      response["token_holder"] == null ||
      response["token_holder"].length == null ||
      response["errors"] ||
      response["token_holder"].length === 0
    ) {
      console.log("Result: no token detected");
      return false;
    } else {
      return true;
    }
  }

  function isTokenUnique(response: any) {
    if (response["token_holder"].length != 1) {
      console.log("Result: multiple tokens detected");
      console.log(response);
      return false;
    } else {
      return true;
    }
  }

  async function reveal() {
    title = constructTitle(queryResponse);
    linkToNft = constructLinkToNft(queryResponse);
    linkToCollection = constructLinkToCollection(queryResponse);
    const imageIpfs = constructIpfsGatewayImageUrl(queryResponse);
    fetch(imageIpfs) // , {mode: "no-cors"} set the request's mode to 'no-cors' to fetch the resource with CORS disabled.
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.blob();
      })
      .then((response) => {
        imageSrc = URL.createObjectURL(response);
      });
    revealed = true;    
  }
</script>

<div class="button-container">
  <button class="font_8" on:click={connected ? disconnect : connect}>
    {connected ? "Disconnect" : "Connect Wallet"}
  </button>

  <button class="font_8" disabled={!connected} on:click={check}>
    Check if Your Portrait is Ready
  </button>

  <button class="font_8" disabled={!(detected && connected)} on:click={reveal} use:sound={{src: vibeSound, events: ["click"]}}>
    Reveal Your Visiblr Portrait
  </button>
</div>

<div class="transition-container">
  {#key connected}
    {#key revealed}
      {#key detected}
        {#key failed}
          <p
            transition:fade={{ duration: 500 }}
            class="textcenter xlarge font_8"
          >
            {@html connected
              ? revealed
                ? "Congratulations! This is your portrait."
                : detected
                ? "Your Visiblr portrait is ready! Let's reveal it now. "
                : failed
                ? "We failed to detect your VISIBLR portrait. Try again or contact us on <a href='https://www.visiblr.io/'>VISIBLR.io</a>."
                : "Connected! Now let's check if your Visiblr portrait is ready."
              : "Please connect your wallet."}
          </p>
        {/key}
      {/key}
    {/key}
  {/key}
</div>

<div class="imagecenter transition-container" id="imageframe">
  {#if revealed}
    <img
      transition:blur={{ duration: 6000 }}
      id="image"
      alt="visiblr portrait"
      src={imageSrc}
    />
    {:else}
    <img
      id="image"
      alt="visiblr placeholder"
      src={imageSrc}
    />  
  {/if}
</div>

<div id="titleframe">
  {#if revealed}
    <p transition:fade={{ duration: 6000 }} class="textcenter large font_8">
      {title}
    </p>
  {/if}
</div>
<div id="linkframe">
  {#if revealed}
    <p
      transition:fade={{ delay: 6000, duration: 2000 }}
      class="textcenter large font_8"
    >
      <a href={linkToNft} target="_blank">Link to your Portrait</a>
    </p>
  {/if}
</div>

<div id="collectionframe">
  {#if revealed}
    <p transition:fade={{ delay: 8000, duration: 2000 }} class="textcenter large font_8">
      Visit the complete Visiblr collection <a href={linkToCollection} target="_blank">here</a>
    </p>
  {/if}
</div>

<style>
  :global(body) {
    background-color: #fafafa;
  }

  @font-face {
    font-family: Jost;
    src: url("assets/Jost-Light.ttf");
  }

  .xlarge {
    font-family: Jost, Futura, Helvetica, Arial, sans-serif;
    font-size: x-large;
    font-feature-settings: "ss01" 1;
    color: black;
  }

  .large {
    font-family: Jost, Futura, Helvetica, Arial, sans-serif;
    font-size: large;
    font-feature-settings: "ss01" 1;
    color: black;
  }

  div#imageframe {
    width: 300px;
    height: 400px;
    padding: 15px;
    border: 3px solid rgb(255, 136, 0);
  }

  img {
    object-fit: cover;
    width: 300px;
    height: 400px;
  }

  .imagecenter {
    display: block;
    margin: auto;
    width: 50%;
  }

  .textcenter {
    text-align: center;
  }

  .transition-container {
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 1fr;
  }

  .transition-container > * {
    grid-row: 1;
    grid-column: 1;
  }
</style>
