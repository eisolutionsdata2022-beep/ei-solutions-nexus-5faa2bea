<?php
require_once('../database/header.php');
?>
<!-- Begin Page Content -->
   <div class="container-fluid">
      <?php if($userdata['usertype']=="mainadmin") {?>	  
<?php
if(isset($_POST['action'])){
	
if($_POST['action']=="Approved"){
$status = "approved";
$username1 = $_POST['username'];
$data = [
$status,
$_POST['usrid']
];

$sql = $conn->prepare("UPDATE loginusers SET vle_id = '".$username1."', status=? WHERE id=?");
if($sql->execute($data)){
echo '<div class="alert alert-success alert-dismissible fade show" role="alert">
  <strong>Approved PSA!</strong> Users Successfully!
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div>';	
}else{
echo '<div class="alert alert-danger alert-dismissible fade show" role="alert">
  <strong>Error!</strong> Data Not Insert!
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div>';		
}	
} else if($_POST['action']=="Rejected"){
$status = "rejected";
$data = [
$status,
$_POST['usrid']
];

$sql = $conn->prepare("UPDATE loginusers SET status=? WHERE id=?");
if($sql->execute($data)){
echo '<div class="alert alert-success alert-dismissible fade show" role="alert">
  <strong>Rejected PSA!</strong> Users Successfully!
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div>';	
}else{
echo '<div class="alert alert-danger alert-dismissible fade show" role="alert">
  <strong>Error!</strong> Data Not Insert!
  <button type="button" class="close" data-dismiss="alert" aria-label="Close">
    <span aria-hidden="true">&times;</span>
  </button>
</div>';		
}


}	
	
}
?> 


<?php
if(isset($_POST['psa_action'])){
$id = get_safe($_POST['id']);   
$stmt = $conn->prepare("select * from loginusers WHERE status = ? AND id='".$id."' ORDER BY `id` DESC");
$stmt->execute(['pending']);
$row = $stmt->fetch();
if($row['id']>0){
$url = "$utiapi_url/CreatePsaApi.html";
$post_data = json_encode($arr = array(
"ApiKey"=>$utiapi_key, 
"Name"=>get_safe($row['owner_name']), 
"StoreName"=>get_safe($row['shop_name']),
"Gender"=>get_safe($row['gender']),
"Dob"=>get_safe(date("Y-m-d",strtotime($row['dob']))),
"PanNo"=>get_safe($row['pan_no']),
"UidNo"=>get_safe($row['uid_no']),
"FatherName"=>get_safe($row['owner_name']),
"Location"=>get_safe($row['address']),
"StateCode"=>getStateId($row['state']),
"PinCode"=>get_safe($row['pin_code']),
"MobileNo"=>get_safe($row['mobile_no']),
"EmailId"=>get_safe($row['email_id'])
)); 

$response = curl_post_req($url,$post_data);
$response= json_decode($response,true);	
//print_r($response);
$status = $response['Status'];
$message = $response['Message'];
$userid = $response['Results']['UserID'];
$re = (int) filter_var($message, FILTER_SANITIZE_NUMBER_INT);
if(strtolower($status)=='success'){
$sql = $conn->prepare("UPDATE loginusers SET status='approved', vle_id='".$userid."', psa_reg_code='".$re."' WHERE id='$id' ");
$sql->execute();    
 echo '<div class="alert alert-success" role="alert">VLE Account Created Successfully!</div>';       
}else{
 echo '<div class="alert alert-danger" role="alert">'.$message.'!</div>';     
}

}else{
 echo '<div class="alert alert-danger" role="alert">User Not Found!</div>';     
}
}
?>


          <!-- DataTales Example -->
          <div class="card shadow mb-4">
            <div class="card-header py-3">
              <h6 class="m-0 font-weight-bold text-primary">Pending PSA</h6>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-bordered" id="dataTable" width="100%" cellspacing="0">
                  <thead>
                    <tr>
                      <th style='display:none;'>SL No.</th>
                      <th class='text-primary'>VLE DETAILS</th>
                      <th class='text-primary'>VLE ADDRESS</th>
                      <th class='text-primary'>VLE KYC</th>
                      <th class='text-primary'>USER TYPE / DATE</th>
                      <th class='text-primary'>APPLY PSA</th>
                      <th class='text-primary'>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
<?php
$stmt = $conn->prepare("select * from loginusers WHERE status = ? AND web_url='".$_SERVER['SERVER_NAME']."' ORDER BY `id` DESC");
if($userdata['usertype']=="mainadmin"){
    $stmt = $conn->prepare("select * from loginusers WHERE status = ? OR vle_id = ' ' ORDER BY `id` DESC LIMIT 100");
}
$stmt->execute(['pending']);
$sl=1;
while($row=$stmt->fetch()) {

$State = $row['state'];

switch ($State) {
        case "2":
        $StateName= "Andhra Pradesh";
        break;
        case "3":
        $StateName= "Arunachal Pradesh";
        break;
        case "4":
        $StateName= "Assam";
        break;
        case "5":
        $StateName= "Bihar";
        break;
        case "33":
        $StateName= "Chhattisgarh";
        break;
        case "10":
        $StateName= "Goa";
        break;
        case "11":
        $StateName= "Gujarat";
        break;
        case "12":
        $StateName= "Haryana";
        break;
        case "13":
        $StateName= "Himachal";
        break;
        case "14":
        $StateName= "Jammu";
        break;
        case "35":
        $StateName= "Jharkhand";
        break;
        case "15":
        $StateName= "Karnataka";
        break;
        case "16":
        $StateName= "Kerala";
        break;
        case "18":
        $StateName= "Madhya Pradesh";
        break;
        case "19":
        $StateName= "Maharashtra";
        break;
        case "20":
        $StateName= "Manipur";
        break;
        case "21":
        $StateName= "Meghalaya";
        break;
        case "22":
        $StateName= "Mizoram";
        break;
        case "24":
        $StateName= "Orissa";
        break;
        case "26":
        $StateName= "Punjab";
        break;
        case "27":
        $StateName= "Rajasthan";
        break;
        case "28":
        $StateName= "Sikkim";
        break;
        case "29":
        $StateName= "Tamil Nadu";
        break;
        case "30":
        $StateName= "Tripura";
        break;
        case "31":
        $StateName= "Uttar Pradesh";
        break;
        case "34":
        $StateName= "Uttarakhand";
        break;
        case "32":
        $StateName= "West Bengal";
        break;
        case "9":
        $StateName= "Delhi";
        break;
        case "6":
        $StateName= "Chandigarh";
        break;
        case "36":
        $StateName= "Telangana";
        break;
        default:
        $StateName= "";
		break;
}	
	

	
	
		      echo "<tr>
                      <td style='display:none;'>".$sl."</td>
                      <td style='font-size:13px' class='text-primary'>".strtoupper($row['username'])."<br>".strtoupper($row['owner_name'])."<br>".strtoupper($row['mobile_no'])."<br>".strtoupper($row['email_id'])."</td>
                      <td><i style='font-size:13px' class='text-primary'>".strtoupper($row['address'])."<br>".strtoupper($StateName)."<br>".strtoupper($row['pin_code'])."<i></td>
                      <td style='font-size:13px' class='text-primary'>".strtoupper($row['uid_no'])."<br>".strtoupper($row['pan_no'])."</td>
                      <td class='text-primary'>".strtoupper($row['usertype'])."<br>".$row['date_time']."</td>
                      <td class='text-primary'>
<form id='addVle' name='myForm' action='' method='post' onsubmit='loader(true);'>
<input type='hidden' name='username' value='".$row['username']."' >
<input type='hidden' name='owner_name'  value='".$row['owner_name']."' >
<input type='hidden' name='mobile_no' value='".$row['mobile_no']."' >
<input type='hidden' name='email_id' value='".$row['email_id']."' >
<input type='hidden' name='shop_name' value='".$row['shop_name']."' >
<input type='hidden' name='address' id='vState' value='".$row['address']."'>
<input type='hidden' name='state' value='".$row['state']."' >
<input type='hidden' name='pin_code' value='".$row['pin_code']."'>
<input type='hidden' name='uid_no' value='".$row['uid_no']."'>
<input type='hidden' name='pan_no' value='".$row['pan_no']."' >
<input type='hidden' name='id' value='".$row['id']."' >
<button type='submit' name='psa_action' class='btn btn-primary btn-sm'>Apply PSA</button>
</form></td>        
                     <td class='text-primary'>
					 <form action='' method='post'>
					 <input type='hidden' name='usrid' value='".$row['id']."'>
					 <input type='hidden' name='username' value='".$row['username']."'>
					 <input type='submit' name='action' class='btn btn-success btn-sm mb-2' value='Approved' onclick=\"return confirm('Are you sure Approved?')\"><br>
					 <input type='submit' name='action' class='btn btn-danger btn-sm'  value='Rejected' onclick=\"return confirm('Are you sure Rejected?')\">
					 </form>
					 </td>
                    </tr>";
$sl++;}							
?>					
                  </tbody>
                </table>
              </div>
            </div>
          </div>
<?php

}else{
?>
<img class="img-fluid" src="../bootstrap/img/cloud.png">
<?php
}
?>
        </div>
        <!-- /.container-fluid -->
      <!-- End of Main Content -->
<?php
require_once('../database/footer.php');
?>